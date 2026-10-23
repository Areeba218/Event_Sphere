import { lazy, Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuroraBackground from "./components/AuroraBackground.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const Help = lazy(() => import("./pages/Help.jsx"));
import heroImage from "./assets/hero.png";
import "./App.css";

const initialEvents = [
  {
    id: 1,
    category: "TECHNOLOGY",
    title: "Pakistan Tech Expo 2026",
    date: "NOV 12–14, 2026",
    location: "Expo Centre, Karachi",
    image:
      "/images/hero.jpg",
    description: "Explore emerging technology, startups and digital innovation.",
  },
  {
    id: 2,
    category: "BUSINESS",
    title: "Business & Trade Summit",
    date: "NOV 20–21, 2026",
    location: "Lahore International Expo Centre",
    image: "/images/trade.jpg",
    description: "Meet industry leaders, discover opportunities and build partnerships.",
  },
  {
    id: 3,
    category: "DESIGN & LIFESTYLE",
    title: "Creative Industry Showcase",
    date: "DEC 05–06, 2026",
    location: "Karachi, Pakistan",
    image:
      "/images/Business.jpg",
    description: "Discover creative brands, new ideas and inspiring experiences.",
  },
];

function HomePage() {
  const loggedIn = Boolean(localStorage.getItem("token"));
  const userRole = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").role || ""; } catch { return ""; } })();
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Events");
  const [publicFeedback, setPublicFeedback] = useState([]);

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "").replace(/\/api$/, "");
    fetch(`${apiUrl}/api/events`).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.events?.length) {
        setEvents(data.events.map((item) => ({
          ...item,
          id: item._id,
          date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase(),
          category: (item.category || "EVENT").toUpperCase(),
          image: item.image || heroImage,
        })));
      }
    }).catch(() => {});
    fetch(`${apiUrl}/api/portal/feedback/public`).then((response) => response.ok ? response.json() : null).then((data) => setPublicFeedback(data?.feedback || [])).catch(() => {});
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = `${event.title} ${event.location} ${event.category}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All Events" || event.category === category.toUpperCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="site-shell">
    <AuroraBackground />
      <header className="site-header">
        <a className="brand" href="#home">
          <span className="brand-icon">E</span>
          <span>Event<span className="brand-accent">Sphere</span></span>
        </a>

        <nav className="main-nav">
          <a className="nav-active" href="#home">Home</a>
          <a href="#events">Explore Events</a>
          <a href="#exhibitors">For Exhibitors</a>
          <a href="#about">About Us</a>
        </nav>

        <div className="header-actions">
          <a className="login-link" href={localStorage.getItem("token") ? "/dashboard" : "/login"}>{localStorage.getItem("token") ? "Dashboard" : "Log in"}</a>
          {!loggedIn && <a className="nav-cta" href="/register">Create Account <span>↗</span></a>}
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-content">
            <motion.div
              className="hero-eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="live-dot" />
              YOUR EVENT. YOUR PEOPLE. YOUR OPPORTUNITY.
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
            >
              Where industries
              <br />
              <span>come together.</span>
            </motion.h1>

            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Discover exhibitions, meet industry leaders, showcase your brand
              and manage every event experience — all in one place.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <a className="primary-button" href="#events">
                Explore Upcoming Events <span>↗</span>
              </a>
              <a className="secondary-button" href="#exhibitors">
                Become an Exhibitor
              </a>
            </motion.div>

            <div className="hero-stats">
              <div>
                <strong>Discover</strong>
                <span>Industry events</span>
              </div>
              <div>
                <strong>Connect</strong>
                <span>With professionals</span>
              </div>
              <div>
                <strong>Grow</strong>
                <span>Your business</span>
              </div>
            </div>
          </div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <img
              className="hero-image"
              src="/images/hero.jpg"
              alt="Professionals gathering at an event"
            />
            <div className="hero-image-overlay" />

            <div className="image-label">
              <span className="label-dot" />
              EXHIBITIONS & TRADE SHOWS
            </div>

            <div className="featured-event">
              <div>
                <span className="featured-label">FEATURED EXPERIENCE</span>
                <h3>Ideas meet opportunity.</h3>
                <p>Find your next connection at EventSphere.</p>
              </div>
              <a href="#events" aria-label="Explore events">↗</a>
            </div>
          </motion.div>
        </section>

        <section className="search-section" aria-label="Find events">
          <div className="search-heading">
            <span className="section-kicker">FIND YOUR NEXT EVENT</span>
            <h2>What are you looking for?</h2>
          </div>

          <div className="event-search">
            <label className="search-field">
              <span className="field-icon">⌕</span>
              <input
                type="search"
                placeholder="Search events, venues or locations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="category-field">
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>All Events</option>
                <option>Technology</option>
                <option>Business</option>
                <option>Design & Lifestyle</option>
              </select>
            </label>

            <a className="search-button" href="#events">Find Events <span>↗</span></a>
          </div>
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <span className="section-kicker">WHAT'S COMING UP</span>
              <h2>Explore upcoming events</h2>
              <p className="section-description">
                Find the right room, the right people and your next big opportunity.
              </p>
            </div>
            <span className="events-count">
              {filteredEvents.length} EVENTS
            </span>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="events-grid">
              {filteredEvents.map((event, index) => (
                <motion.article
                  className="event-card"
                  key={event.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                >
                  <div className="event-image-wrap">
                    <img src={event.image} alt={event.title} loading="lazy" onError={(e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = "true"; e.currentTarget.src = heroImage; } }} />
                    <span className="event-category">{event.category}</span>
                  </div>

                  <div className="event-card-content">
                    <span className="event-date">{event.date}</span>
                    <h3>{event.title}</h3>
                    <p className="event-description">{event.description}</p>
                    <div className="event-location">
                      <span>⌖</span> {event.location}
                    </div>
                    <div className="event-card-footer">
                      <span className="event-type">Expo / Exhibition</span>
                      <a href={loggedIn ? "/dashboard?tab=events" : "/register"} aria-label={`View ${event.title}`}>
                        View Event <span>↗</span>
                      </a>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="empty-results">
              <h3>No matching events found</h3>
              <p>Try another event name, location or category.</p>
              <button
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setCategory("All Events");
                }}
              >
                Clear Search
              </button>
            </div>
          )}
        </section>

        <section className="exhibitor-section" id="exhibitors">
          <div className="exhibitor-copy">
            <span className="section-kicker">FOR BUSINESSES & BRANDS</span>
            <h2>Don't just attend.<br /><span>Make an impression.</span></h2>
            <p>
              Put your business in front of the right audience. Apply for
              exhibitions, manage your booth and turn conversations into
              meaningful connections.
            </p>
            <a className="primary-button" href={loggedIn ? (userRole === "exhibitor" ? "/dashboard?tab=applications" : "/dashboard") : "/register"}>
  {loggedIn && userRole === "exhibitor" ? "Apply for an Expo" : loggedIn ? "Open Dashboard" : "Register as an Exhibitor"} <span>↗</span>
</a>
          </div>

          <div className="exhibitor-benefits">
            <div className="benefit-row">
              <span className="benefit-number">01</span>
              <div>
                <h3>Find the right expo</h3>
                <p>Explore events that match your industry and goals.</p>
              </div>
              <span className="benefit-arrow">↗</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-number">02</span>
              <div>
                <h3>Apply for your booth</h3>
                <p>Submit an application and keep track of its status.</p>
              </div>
              <span className="benefit-arrow">↗</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-number">03</span>
              <div>
                <h3>Manage your presence</h3>
                <p>Keep your company and exhibition information together.</p>
              </div>
              <span className="benefit-arrow">↗</span>
            </div>
          </div>
        </section>

        {publicFeedback.length > 0 && <section className="events-section public-feedback-section" id="community-feedback"><div className="section-heading"><div><span className="section-kicker">COMMUNITY VOICES</span><h2>Attendee feedback</h2><p className="section-description">Experiences and feedback shared by our community.</p></div></div><div className="events-grid">{publicFeedback.map((item) => <article className="event-card feedback-card" key={item._id}><div className="event-card-content"><span className="event-date">{item.rating ? `Rating: ${item.rating}/5` : 'Community feedback'}</span><p className="event-description">“{item.message}”</p><div className="event-location">{item.user?.name || 'EventSphere member'}{item.event?.title ? ` · ${item.event.title}` : ''}</div></div></article>)}</div></section>}

        <section className="organizer-section" id="about">
          <div className="organizer-icon">ES</div>
          <div className="organizer-copy">
            <span className="section-kicker">FOR EVENT ORGANIZERS</span>
            <h2>Your event, organized in one place.</h2>
            <p>
              Manage event listings, exhibitor applications, booth allocation
              and attendee registrations from one central platform.
            </p>
          </div>
          <a className="secondary-button" href={loggedIn ? "/dashboard" : "/login"}>
  {loggedIn ? "Open Dashboard" : "Organizer Login"} <span>↗</span>
</a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#home">
          <span className="brand-icon">E</span>
          <span>Event<span className="brand-accent">Sphere</span></span>
        </a>
        <p>Connecting people, businesses and experiences.</p>
        <span>© 2026 EventSphere Management · <a href="/privacy">Privacy</a> · <a href="/help">Help</a></span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p style={{ padding: 40, color: "#cfc5d9" }}>Loading…</p>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;