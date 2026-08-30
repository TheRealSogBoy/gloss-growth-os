import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ConfigContext = createContext();

const INITIAL_EQUIPO = [
  { nombre: 'Santiago', cargo: 'Director General & Estrategia', correo: 'santiago@glossgrowth.com', color: 'bg-rose-600 text-white', iniciales: 'ST' },
  { nombre: 'Davilson', cargo: 'Director Creativo & Paid Media', correo: 'davilson@glossgrowth.com', color: 'bg-purple-600 text-white', iniciales: 'DV' },
  { nombre: 'Laura', cargo: 'Account Manager & Comercial', correo: 'laura@glossgrowth.com', color: 'bg-pink-600 text-white', iniciales: 'LM' },
  { nombre: 'Equipo Comercial', cargo: 'Ventas & Prospección B2B', correo: 'ventas@glossgrowth.com', color: 'bg-amber-600 text-white', iniciales: 'EC' },
  { nombre: 'Equipo Ads', cargo: 'Media Buying & Tráfico Pagado', correo: 'ads@glossgrowth.com', color: 'bg-blue-600 text-white', iniciales: 'EA' },
  { nombre: 'Finanzas', cargo: 'Administración & Tesorería', correo: 'admin@glossgrowth.com', color: 'bg-emerald-600 text-white', iniciales: 'FN' }
];

const INITIAL_AGENCIA = {
  nombre: 'Gloss Growth OS',
  nit: 'NIT 901.845.230-4',
  direccion: 'Cra. 43A # 1 Sur - 50, San Fernando Plaza',
  telefono: '+57 (300) 456-7890',
  correo: 'contacto@glossgrowth.com',
  ciudad: 'Medellín, Colombia',
  sitio_web: 'https://glossgrowhq.com',
  lema: 'Soluciones Estratégicas para el Sector Salud & Estética'
};

export function ConfigProvider({ children }) {
  const [equipo, setEquipo] = useState([]);
  const [datosAgencia, setDatosAgencia] = useState(INITIAL_AGENCIA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      // Fetch equipo
      let { data: eqData, error: eqErr } = await supabase.from('equipo').select('*').order('created_at', { ascending: true });
      if (eqErr) throw eqErr;
      
      if (!eqData || eqData.length === 0) {
        // Seed initial data
        const { data: newEq, error: insertErr } = await supabase.from('equipo').insert(INITIAL_EQUIPO).select();
        if (insertErr) console.error('Error seeding equipo:', insertErr);
        if (newEq) eqData = newEq;
      }
      setEquipo(eqData || []);

      const localSitioWeb = typeof window !== 'undefined' ? localStorage.getItem('gloss_agencia_sitio_web') : null;

      // Fetch agencia
      let { data: agData, error: agErr } = await supabase.from('agencia_datos').select('*').limit(1);
      if (agErr) throw agErr;

      if (!agData || agData.length === 0) {
        // Seed initial agencia
        const { data: newAg, error: insAgErr } = await supabase.from('agencia_datos').insert([{
          nombre: INITIAL_AGENCIA.nombre,
          nit: INITIAL_AGENCIA.nit,
          direccion: INITIAL_AGENCIA.direccion,
          telefono: INITIAL_AGENCIA.telefono,
          correo: INITIAL_AGENCIA.correo,
          ciudad: INITIAL_AGENCIA.ciudad,
          lema: INITIAL_AGENCIA.lema
        }]).select();
        if (insAgErr) console.error('Error seeding agencia:', insAgErr);
        if (newAg && newAg.length > 0) {
          setDatosAgencia({
            ...newAg[0],
            sitio_web: newAg[0].sitio_web || newAg[0].website || localSitioWeb || INITIAL_AGENCIA.sitio_web
          });
        }
      } else {
        setDatosAgencia({
          ...agData[0],
          sitio_web: agData[0].sitio_web || agData[0].website || localSitioWeb || INITIAL_AGENCIA.sitio_web
        });
      }

    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMiembro = async (miembro) => {
    const iniciales = miembro.nombre.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'MI';
    const color = miembro.color || 'bg-rose-600 text-white';
    
    const { data, error } = await supabase.from('equipo').insert([{ ...miembro, iniciales, color }]).select();
    if (!error && data) {
      setEquipo((prev) => [...prev, data[0]]);
    }
  };

  const updateMiembro = async (id, miembroActualizado) => {
    const iniciales = (miembroActualizado.nombre || '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    const updates = { ...miembroActualizado };
    if (iniciales) updates.iniciales = iniciales;

    const { data, error } = await supabase.from('equipo').update(updates).eq('id', id).select();
    if (!error && data) {
      setEquipo((prev) => prev.map((m) => (m.id === id ? data[0] : m)));
    }
  };

  const deleteMiembro = async (id) => {
    const { error } = await supabase.from('equipo').delete().eq('id', id);
    if (!error) {
      setEquipo((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const updateDatosAgencia = async (nuevosDatos) => {
    if (typeof window !== 'undefined' && nuevosDatos.sitio_web) {
      localStorage.setItem('gloss_agencia_sitio_web', nuevosDatos.sitio_web);
    }

    try {
      if (datosAgencia.id) {
        const { data, error } = await supabase.from('agencia_datos').update(nuevosDatos).eq('id', datosAgencia.id).select();
        if (error) {
          // If schema cache doesn't recognize sitio_web column, remove it from payload sent to postgres
          const { sitio_web, website, ...cleanPayload } = nuevosDatos;
          const { data: fallbackData } = await supabase.from('agencia_datos').update(cleanPayload).eq('id', datosAgencia.id).select();
          if (fallbackData && fallbackData.length > 0) {
            setDatosAgencia({ ...fallbackData[0], sitio_web: nuevosDatos.sitio_web });
            return;
          }
        } else if (data && data.length > 0) {
          setDatosAgencia({ ...data[0], sitio_web: nuevosDatos.sitio_web || data[0].sitio_web });
          return;
        }
      } else {
        const { sitio_web, website, ...cleanPayload } = nuevosDatos;
        const { data, error } = await supabase.from('agencia_datos').insert([cleanPayload]).select();
        if (!error && data) {
          setDatosAgencia({ ...data[0], sitio_web: nuevosDatos.sitio_web });
          return;
        }
      }
    } catch (e) {
      console.warn('DB update error on agencia_datos:', e);
    }

    setDatosAgencia((prev) => ({ ...prev, ...nuevosDatos }));
  };

  const responsablesList = equipo.map((m) => m.nombre);

  return (
    <ConfigContext.Provider
      value={{
        equipo,
        datosAgencia,
        addMiembro,
        updateMiembro,
        deleteMiembro,
        updateDatosAgencia,
        responsablesList,
        loading
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de un ConfigProvider');
  }
  return context;
}
