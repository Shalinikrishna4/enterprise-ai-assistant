import logging
import sys
import uuid
from contextvars import ContextVar
from typing import Any, Dict

import structlog
from structlog.types import EventDict, WrappedLogger

_request_id: ContextVar[str] = ContextVar("request_id", default="")
_user_id: ContextVar[str] = ContextVar("user_id", default="anonymous")


def get_request_id() -> str:
    return _request_id.get() or str(uuid.uuid4())


def set_request_context(request_id: str, user_id: str = "anonymous") -> None:
    _request_id.set(request_id)
    _user_id.set(user_id)


def _add_request_context(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    rid = _request_id.get("")
    uid = _user_id.get("anonymous")
    if rid:
        event_dict["request_id"] = rid
    if uid and uid != "anonymous":
        event_dict["user_id"] = uid
    return event_dict


def configure_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            _add_request_context,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),  # ✅ FIXED
        cache_logger_on_first_use=True,
    )

    handler = logging.StreamHandler(sys.stdout)
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))


def get_logger(name: str, **initial_context: Any):
    logger = structlog.get_logger(name)
    if initial_context:
        logger = logger.bind(**initial_context)
    return logger


class MetricsLogger:
    def __init__(self) -> None:
        self._counters: Dict[str, int] = {}
        self._histograms: Dict[str, list] = {}
        self._logger = get_logger(__name__)

    def increment(self, metric: str, value: int = 1, **labels: Any) -> None:
        key = f"{metric}:{labels}"
        self._counters[key] = self._counters.get(key, 0) + value

    def record(self, metric: str, value: float, **labels: Any) -> None:
        key = f"{metric}:{labels}"
        if key not in self._histograms:
            self._histograms[key] = []
        self._histograms[key].append(value)


metrics = MetricsLogger()
logger = get_logger(__name__)
