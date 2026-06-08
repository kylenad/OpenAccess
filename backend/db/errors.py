import re

def _extract_column(error_msg: str) -> str:
    match = re.search(r'column "([^"]+)"', error_msg)
    if match:
        return match.group(1)
    match = re.search(r"column '([^']+)'", error_msg)
    return match.group if match else "unknown"


def _translate_error(error: Exception) -> str | None:
    msg = str(error).lower()

    # Postgres errors
    try:
        import psycopg2.errors
        if isinstance(error, psycopg2.errors.InvalidTextRepresentation):
            return f'Invalid value for "{_extract_column(str(error))}" — check the data type'
        if isinstance(error, psycopg2.errors.NotNullViolation):
            return f'"{_extract_column(str(error))}" is required and cannot be empty'
        if isinstance(error, psycopg2.errors.UniqueViolation):
            return f'A record with this value for "{_extract_column(str(error))}" already exists'
        if isinstance(error, psycopg2.errors.ForeignKeyViolation):
            return 'Cannot complete — this record is referenced by another table'
        if isinstance(error, psycopg2.errors.CheckViolation):
            return 'Value not allowed — check Yes/No fields'
        if isinstance(error, psycopg2.errors.StringDataRightTruncation):
            return f'Value is too long for "{_extract_column(str(error))}"'
        if isinstance(error, psycopg2.errors.NumericValueOutOfRange):
            return f'Number is out of range for "{_extract_column(str(error))}"'
    except ImportError:
        pass

    # MSSQL errors
    if "cannot insert duplicate key" in msg or "unique constraint" in msg or "violation of unique" in msg:
        return f'A record with this value already exists'
    if "cannot insert the value null" in msg or "not null constraint" in msg:
        return f'A required field cannot be empty'
    if "foreign key constraint" in msg or "conflicted with the foreign key" in msg:
        return 'Cannot complete — this record is referenced by another table'
    if "arithmetic overflow" in msg or "out of range" in msg:
        return 'Number is out of range for this field'
    if "string or binary data would be truncated" in msg:
        return 'Value is too long for this field'
    if "conversion failed" in msg or "invalid column value" in msg:
        return 'Invalid value — check the data type'
    if "check constraint" in msg:
        return 'Value not allowed — check Yes/No fields'

    return None

def handle_db_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValueError:
            raise
        except Exception as e:
            msg = _translate_error(e)
            if msg:
                raise ValueError(msg)
            raise 
    return wrapper
