import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import './fixIcons.js';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [spots, setSpots] = useState([]);
  const [mushroom, setMushroom] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchSpots();
    }
  }, [session]);

  async function fetchSpots() {
    const { data } = await supabase
      .from('Sienipaikka')
      .select('*')
      .order('created_at', { ascending: false });

    setSpots(data || []);
  }

  async function handleAuth(e, type) {
    e.preventDefault();
    if (!email || !pw) {
      alert('syötä sähköposti ja salasana');
      return;
    }

    setLoading(true);

    let result;
    if (type === 'signup') {
      result = await supabase.auth.signUp({ email, password: pw });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password: pw });
    }

    if (result.error) {
      alert(result.error.message);
    }

    setLoading(false);
  }

  function saveSpot() {
    if (!mushroom.trim()) {
      alert('Kirjaa sienilaji ja tallenna paikka');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        await supabase.from('Sienipaikka').insert([
          {
            lajike: mushroom,
            latitude,
            longitude,
            kayttaja_id: session.user.id,
          },
        ]);

        setMushroom('');
        await fetchSpots();
        setLoading(false);
      },
      (err) => {
        alert('Sijaintia ei saatu: ' + err.message);
        setLoading(false);
      }
    );
  }

  if (!session) {
    return (
      <div className="app-container">
        <h1>Sienikartta</h1>
        <form className="form-group">
          <input
            type="email"
            placeholder="Sähköposti"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Salasana"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            className="primary-btn"
            onClick={(e) => handleAuth(e, 'login')}
            disabled={loading}
          >
            {loading ? 'Hetki...' : 'Kirjaudu sisään'}
          </button>
          <button
            className="secondary-btn"
            onClick={(e) => handleAuth(e, 'signup')}
            disabled={loading}
          >
            Luo uusi tili

          </button>
        </form>
      </div>
    );
  }

  const center =
    spots.length > 0 && spots[0].latitude
      ? [spots[0].latitude, spots[0].longitude]
      : [60.1699, 24.9384];

  return (
    <div className="app-container">
      <div className="header-bar">
        <span>{session.user.email}</span>
        <button className="secondary-btn" onClick={() => supabase.auth.signOut()}>
          Kirjaudu ulos
        </button>
      </div>

      <h1>Sienikartta</h1>

      <h3>
        Löysitkö hyvän sienipaikan? Kerro mitä sientä löysit ja tallenna paikka, niin löydät tänne myöhemmin.
      </h3>

      <div className="form-group">
        <input
          type="text"
          placeholder="Kirjaa sienilaji, esim. kantarelli"
          value={mushroom}
          onChange={(e) => setMushroom(e.target.value)}
        />
        <button className="primary-btn" onClick={saveSpot} disabled={loading}>
          {loading ? 'Haetaan sijaintia...' : 'Tallenna nykyinen sijainti'}
        </button>
      </div>

      <h2>Omia sienipaikkoja ({spots.length})</h2>

      <div className="map-wrapper">
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {spots.map((s) =>
            s.latitude ? (
              <Marker key={s.id} position={[s.latitude, s.longitude]}>
                <Popup>
                  <strong>{s.lajike}</strong>
                  <br />
                  <small>{new Date(s.created_at).toLocaleDateString('fi-FI')}</small>
                </Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;