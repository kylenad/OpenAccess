from abc import ABC, abstractmethod

class DbAdapter(ABC):
    @abstractmethod
    def list_tables(self) -> list[str]:
        pass

    @abstractmethod
    def get_columns(self, table: str) -> list[dict]:
        pass

    @abstractmethod
    def get_rows(self, table: str) -> list[dict]:
        pass

    @abstractmethod
    def close(self) -> None:
        pass

