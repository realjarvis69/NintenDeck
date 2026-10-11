from pydantic import RootModel, BaseModel


PackageConfig = RootModel[dict[str, str | dict]]


class PackageGroupConfigDetails(BaseModel):
    description: str | None = None
    default: bool = True
    required: bool = False
    packages: list[PackageConfig]


PackageGroupConfig = RootModel[dict[str, PackageGroupConfigDetails]]
