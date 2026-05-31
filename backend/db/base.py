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

    @abstractmethod
    def update_cell(self, table: str, pk_col: str, pk_val, column: str, value) -> None:
        pass

    @abstractmethod
    def insert_row(self, table: str, values: dict) -> None:
        pass

    def delete_row(self, table: str, pk_col: str, pk_val) -> None:
        pass
