"""
Copyright 2023 Marco Ceppi

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

from typing import Any
from yafti import log

_listeners = {}


class EventException(Exception):
    """Event system encountered a problem"""


class EventAlreadyRegisteredError(EventException):
    """Event name already exists"""


class EventNotRegisteredError(EventException):
    """Event name does not exist"""


def register(event_name):
    if event_name in _listeners:
        raise EventAlreadyRegisteredError(
            "event is already registered", event=event_name
        )
    _listeners[event_name] = []


def on(event_name: str, fn: Any):
    if event_name not in _listeners:
        raise EventNotRegisteredError("event name not registered", event=event_name)
    if fn in _listeners[event_name]:
        log.debug("EVENTS: listener already attached", event=event_name, fn=fn)
        return
    log.debug("EVENTS: attaching listener", event=event_name, fn=fn)
    _listeners[event_name].insert(0, fn)


def detach(event_name: str, fn: Any):
    if event_name not in _listeners:
        log.debug("EVENTS: cannot detach, event not registered", event=event_name)
        return

    to_remove = []
    for registered_fn in _listeners[event_name]:
        if registered_fn == fn:
            to_remove.append(registered_fn)
        # Robustly handle bound method equality comparison
        elif (
            hasattr(registered_fn, "__func__")
            and hasattr(fn, "__func__")
            and registered_fn.__func__ == fn.__func__
            and getattr(registered_fn, "__self__", None) == getattr(fn, "__self__", None)
        ):
            to_remove.append(registered_fn)

    if not to_remove:
        log.debug("EVENTS: listener not in list to detach", event=event_name, fn=fn)
        return

    for r in to_remove:
        log.debug("EVENTS: detaching listener", event=event_name, fn=r)
        _listeners[event_name].remove(r)


async def emit(event_name, *args, **kwargs):
    log.debug("EVENTS: emitting event", event_name=event_name, listeners=len(_listeners.get(event_name, [])))
    if event_name not in _listeners:
        raise EventNotRegisteredError("event name not registered", event=event_name)

    for fn in list(_listeners[event_name]):
        log.debug("EVENTS: calling listener", event_name=event_name, fn=fn)
        result = await fn(*args, **kwargs)
        log.debug("EVENTS: listener returned", event_name=event_name, fn=fn, result=result)
        # If listener returned True or non-False result, mark event as handled
        if result is True:
            return True
        if result is not False and result is not None:
            return True

    return False
