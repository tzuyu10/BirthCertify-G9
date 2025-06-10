import * as IoIcons from "react-icons/io";

const DownloadBox = ({ fileName }) => (
  <div className="download-box">
    <h4><IoIcons.IoIosDownload/> Download</h4>
    <p>{fileName}</p>
  </div>
);

export default DownloadBox;
