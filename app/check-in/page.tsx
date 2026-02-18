"use client";

import { useState } from "react";
import { events } from "@/lib/mockData";

export default function CheckInPage() {
  const [checkedIn, setCheckedIn] = useState<string[]>([]);

  const toggleCheckIn = (eventId: string) => {
    setCheckedIn((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    );
  };

  return (
    <section className="card">
      <h2>Player Check-In App</h2>
      <p>Designed for mobile use before practices, games, and team events.</p>
      <div className="stack">
        {events.map((event) => {
          const isChecked = checkedIn.includes(event.id);
          return (
            <article key={event.id} className="event-card">
              <h3>{event.title}</h3>
              <p>{new Date(event.date).toLocaleString()}</p>
              <button
                className={isChecked ? "button alt" : "button"}
                onClick={() => toggleCheckIn(event.id)}
              >
                {isChecked ? "Checked In" : "Tap to Check In"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
