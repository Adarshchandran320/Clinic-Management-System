import React from "react";

export default function Loader({ message = "Loading data..." }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 my-2">
      <div className="spinner-border text-primary mb-2" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <span className="text-secondary small">{message}</span>
    </div>
  );
}
