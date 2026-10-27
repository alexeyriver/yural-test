export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2 mb-0" role="alert">
      <span className="me-auto">{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}
