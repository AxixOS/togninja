import React, { useEffect, useState } from 'react';

type Slot = string;

export default function BookingWidget({ calendarId }: { calendarId?: string }) {
  const [start, setStart] = useState<string>(() => new Date().toISOString());
  const [end, setEnd] = useState<string>(() => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', selected: '' });

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ start, end });
      if (calendarId) q.set('calendarId', calendarId);
      const resp = await fetch(`/api/embed/availability?${q.toString()}`);
      if (!resp.ok) throw new Error('Failed to load availability');
      const data = await resp.json();
      setSlots(data.available || []);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  async function doBook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.selected) return alert('Please pick a slot');
    setLoading(true);
    try {
      const resp = await fetch('/api/embed/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          startTime: form.selected,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Booking failed');
      setBooking(data.booking || data);
      setSlots(prev => prev.filter(s => s !== form.selected));
    } catch (err: any) {
      alert(err.message || 'Booking failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, maxWidth: 420 }}>
      <h3>Book a session</h3>
      <div style={{ marginBottom: 8 }}>
        <label>Window start: <input type="datetime-local" value={new Date(start).toISOString().slice(0,16)} onChange={(e)=>setStart(new Date(e.target.value).toISOString())} /></label>
        <label style={{ marginLeft: 8 }}>end: <input type="datetime-local" value={new Date(end).toISOString().slice(0,16)} onChange={(e)=>setEnd(new Date(e.target.value).toISOString())} /></label>
        <button onClick={fetchSlots} disabled={loading} style={{ marginLeft: 8 }}>Refresh</button>
      </div>

      <div style={{ minHeight: 120 }}>
        {loading ? <div>Loading slots...</div> : (
          slots.length === 0 ? <div>No available slots</div> : (
            <ul>
              {slots.map(s => (
                <li key={s}><label><input type="radio" name="slot" value={s} checked={form.selected===s} onChange={()=>setForm({...form, selected: s})} /> {new Date(s).toLocaleString()}</label></li>
              ))}
            </ul>
          )
        )}
      </div>

      {!booking ? (
        <form onSubmit={doBook}>
          <div><input required placeholder="First name" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} /></div>
          <div><input placeholder="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} /></div>
          <div><input required placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} /></div>
          <div><input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} /></div>
          <div style={{ marginTop: 8 }}>
            <button type="submit" disabled={loading}>Book selected slot</button>
          </div>
        </form>
      ) : (
        <div>Booking received. Reference: {booking.id || booking.booking?.id || 'n/a'}</div>
      )}
    </div>
  );
}
