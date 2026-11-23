import { Link } from "react-router-dom";
import { CalendarCheck, ClipboardList, History, MapPinned, Recycle, ShieldCheck, Truck, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useParallax, useReveal } from "../hooks/useUi";

const STEPS = [
  { icon: ClipboardList, title: "Submit a request", text: "A resident enters the pickup address, waste type and a preferred date and time window." },
  { icon: CalendarCheck, title: "Personnel schedule it", text: "Waste management personnel review the request and confirm a collection date and window." },
  { icon: UserCheck, title: "A crew member is assigned", text: "The task goes to a named team member, who sees it in their task list." },
  { icon: Truck, title: "Pickup and status update", text: "The crew starts the pickup and marks it completed. The resident sees every change." },
];

const FEATURES = [
  { icon: ClipboardList, title: "Structured requests", text: "Every request has a reference number, address, waste type and preferred slot, so nothing depends on a phone call." },
  { icon: CalendarCheck, title: "Real scheduling", text: "Collections are scheduled per request and grouped by day, so crews can see what is coming." },
  { icon: UserCheck, title: "Clear ownership", text: "Each collection has one assigned team member, with reassignment when plans change." },
  { icon: MapPinned, title: "Status you can follow", text: "Pending, Scheduled, Assigned, In Progress, Completed or Cancelled. Always one, always visible." },
  { icon: History, title: "Collection records", text: "Completed and cancelled collections stay searchable, with a progress log on every request." },
  { icon: ShieldCheck, title: "Role based access", text: "Residents see their own requests. Personnel run operations. Administrators manage accounts." },
];

function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useReveal();
  return <Tag ref={ref} className={`reveal ${className}`}>{children}</Tag>;
}

export default function Landing() {
  const { user } = useAuth();
  const ticketRef = useParallax(0.08);
  const orbRef = useParallax(-0.05);

  return (
    <div className="landing">
      <header className="lp-header">
        <Link to="/" className="brand"><Recycle size={22} aria-hidden="true" /> Waste Collection</Link>
        <nav className="lp-nav">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          {user ? <Link to="/dashboard" className="btn btn-primary btn-md">Open dashboard</Link> : (<><Link to="/login" className="btn btn-ghost btn-md">Sign in</Link><Link to="/register" className="btn btn-primary btn-md">Get started</Link></>)}
        </nav>
      </header>

      <section className="hero">
        <div ref={orbRef} className="hero-orb" aria-hidden="true" />
        <div className="hero-copy">
          <h1>Request a pickup. Watch it get done.</h1>
          <p>One place for residents to ask for waste collection and for waste management teams to schedule it, assign it and close it out, with every step on record.</p>
          <div className="hero-actions">
            <Link to={user ? "/requests/new" : "/register"} className="btn btn-primary btn-lg">Request a collection</Link>
            <a href="#how" className="btn btn-secondary btn-lg">See how it works</a>
          </div>
        </div>
        <div ref={ticketRef} className="ticket" aria-label="Illustration of a request moving through its statuses">
          <div className="ticket-head"><strong>Example request</strong><span className="badge badge-active"><Truck size={13} aria-hidden="true" />In Progress</span></div>
          <p className="ticket-addr">12 Example Street, Kaduna</p>
          <ol className="ticket-steps">
            <li className="done">Submitted</li>
            <li className="done">Scheduled for Friday, morning</li>
            <li className="done">Assigned to a crew member</li>
            <li className="current">Pickup in progress</li>
            <li>Completed</li>
          </ol>
        </div>
      </section>

      <Reveal as="section" className="lp-section lp-split">
        <h2>Missed pickups usually start as missing information</h2>
        <p>When requests arrive by phone or message, nobody can say who owns a pickup, when it is due or whether it happened. Waste builds up while people chase answers. This system replaces that with one shared record per request.</p>
      </Reveal>

      <section id="how" className="lp-section">
        <Reveal><h2>How a request moves from ask to done</h2></Reveal>
        <ol className="steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title}><span className="step-n">{i + 1}</span><Icon size={22} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></Reveal>
          ))}
        </ol>
      </section>

      <section id="features" className="lp-section tinted">
        <Reveal><h2>What the system covers</h2></Reveal>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Reveal key={title} className="feature"><Icon size={22} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="lp-section roles">
        <div><h3>Residents</h3><p>Submit requests, follow their status and keep a history of past collections.</p></div>
        <div><h3>Waste personnel</h3><p>Review requests, schedule collections, work through assigned tasks and update status.</p></div>
        <div><h3>Administrators</h3><p>Create personnel accounts, manage roles and monitor activity across the system.</p></div>
      </Reveal>

      <Reveal as="section" className="lp-cta">
        <h2>Ready to book your first collection?</h2>
        <p>Create a resident account in under a minute.</p>
        <Link to={user ? "/requests/new" : "/register"} className="btn btn-light btn-lg">{user ? "Create a request" : "Create an account"}</Link>
      </Reveal>

      <footer className="lp-footer"><span className="brand"><Recycle size={18} aria-hidden="true" /> Waste Collection Scheduling and Tracking System</span><span>Final year project</span></footer>
    </div>
  );
}
