class PackageScreenState:
    __slots__ = ["state"]

    def __new__(cls, id: str):
        if not hasattr(cls, "instances"):
            cls.instances = {}
        if id not in cls.instances:
            cls.instances[id] = super(PackageScreenState, cls).__new__(cls)
        return cls.instances[id]

    def __init__(self, id: str):
        if not hasattr(self, "state"):
            self.state = {}

    def load(self, data: dict) -> None:
        self.state.update(data)

    def remove(self, item: str) -> None:
        self.state.pop(item, None)

    def on(self, item: str) -> None:
        self.state[item] = True

    def off(self, item: str) -> None:
        self.state[item] = False

    def toggle(self, item: str) -> bool:
        new_val = not self.state.get(item, False)
        self.state[item] = new_val
        return new_val

    def set(self, item: str, state: bool) -> None:
        self.state[item] = state

    def get_on(self, prefix: str = "") -> list[str]:
        return [
            item
            for item, value in self.state.items()
            if item.startswith(prefix) and value is True
        ]

    def keys(self) -> list[str]:
        return list(self.state.keys())

    def get(self, item: str) -> bool:
        return self.state.get(item, False)
