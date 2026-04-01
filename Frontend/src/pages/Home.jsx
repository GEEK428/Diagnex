import { Dna } from "lucide-react";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-card">
        <div className="home-icon">
          <Dna size={42} color="#2b4c3b" strokeWidth={2.4} />
        </div>

        <h1>Welcome to Diagnex</h1>

        <p>
          Select a section from the left menu to get started with managing
          clinical terminology data.
        </p>
      </div>
    </div>
  );
}
