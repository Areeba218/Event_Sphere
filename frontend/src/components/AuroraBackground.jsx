import './AuroraBackground.css';

export default function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="shape orb orb-blue" />
      <span className="shape orb orb-pink" />
      <span className="shape orb orb-violet" />
      <span className="shape glass glass-one" />
      <span className="shape glass glass-two" />
      <span className="shape ring ring-one" />
      <span className="shape ring ring-two" />
    </div>
  );
}