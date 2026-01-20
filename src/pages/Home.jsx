import { FaArrowLeft } from "react-icons/fa";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-card">
        <div className="home-icon">
          <FaArrowLeft />
        </div>

        <h1>Welcome to NAMASTE Terminology</h1>

        <p>
          Select a section from the left menu to get started with managing
          clinical terminology data.
        </p>
      </div>
    </div>
  );
}
