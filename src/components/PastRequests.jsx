const PastRequests = ({ requests }) => (
  <div className="past-requests">
    <h3>Past Requests</h3>
    <div className="request-list">
      {requests.length === 0 ? (
        <p>No past requests found.</p>
      ) : (
        <ul>
          {requests.map((r, i) => (
            <li key={i}>Request #{r.id} - {r.status}</li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

export default PastRequests;