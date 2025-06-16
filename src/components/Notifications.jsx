import * as IoIcons from "react-icons/io";

const NotificationBox = ({ notifications }) => (
  <div className="notification-box">
    <h4>
      <IoIcons.IoIosNotifications /> Notification
    </h4>
    <ul>
      {notifications.map((note, i) => (
        <li key={i}> {note}</li>
      ))}
    </ul>
  </div>
);

export default NotificationBox;
