import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { logAuditoria } from '../utils/audit';
import { sendTelegramNotification, createCalendarEvent } from '../lib/notifications';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, PiggyBank, Users, Wallet, 
  RefreshCw, Landmark, ArrowDownCircle, ArrowUpCircle, CreditCard, 
  Clock, CheckCircle, AlertTriangle, Pencil, Check, X, ArrowRight,
  BookOpen, Filter, Search, Activity, Sparkles, Send
} from 'lucide-react';

export const CATEGORIAS_GASTOS = [
  "Edicion de videos",
  "Diseño grafico",
  "Nómina",
  "Desarrollo Web",
  "Suscripciones",
  "Tokens",
  "Intereses",
  "SaaS",
  "Servicios",
  "Pauta Digital",
  "Impuestos"
];

// Helper de formateo de fecha y hora exacta
const formatTimestamp = (createdAt, fallbackDate) => {
  const raw = createdAt || fallbackDate;
  if (!raw) return 'Reciente';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);

    // Formato exacto: 2026-08-30 • 02:35 PM
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = String(hours).padStart(2, '0');

    // Si viene solo fecha corta sin hora (ej. YYYY-MM-DD)
    if (typeof raw === 'string' && raw.length <= 10) {
      return `${yyyy}-${mm}-${dd} • 12:00 PM`;
    }

    return `${yyyy}-${mm}-${dd} • ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(raw);
  }
};

export default function Finanzas() {
  const { user, isSuperAdmin } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  // === ESTADOS DE DATOS ===
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [comprasTDC, setComprasTDC] = useState([]);
  const [deudasPendientes, setDeudasPendientes] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [transferenciasBoveda, setTransferenciasBoveda] = useState([]);

  // === CONFIGURACIÓN DINÁMICA DE BÓVEDA ===
  const [porcentajeBoveda, setPorcentajeBoveda] = useState(15);
  const [saldoBoveda, setSaldoBoveda] = useState(0);
  const [isEditingPct, setIsEditingPct] = useState(false);
  const [tempPct, setTempPct] = useState(15);

  // === FILTRO LIBRO MAYOR ===
  const [filtroLibro, setFiltroLibro] = useState('todos'); // 'todos' | 'ingresos' | 'gastos' | 'boveda_socios'
  const [searchLibro, setSearchLibro] = useState('');

  // === ESTADOS DE MODALES ===
  const [modalIngreso, setModalIngreso] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalFijo, setModalFijo] = useState(false);
  const [modalDeuda, setModalDeuda] = useState(false);
  const [modalRetiro, setModalRetiro] = useState(false);
  const [modalBoveda, setModalBoveda] = useState(false);
  const [tabBoveda, setTabBoveda] = useState('transferir'); // 'transferir' | 'gasto'

  // === ESTADOS DE FORMULARIOS ===
  const [formIngreso, setFormIngreso] = useState({ concepto: '', cliente: '', tipo: 'Retainer', monto: '', fecha: new Date().toISOString().split('T')[0] });
  const [formGasto, setFormGasto] = useState({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Caja General' });
  const [formFijo, setFormFijo] = useState({ concepto: '', categoria: 'SaaS', monto: '', fechaInicio: new Date().toISOString().split('T')[0], diaCobro: 1 });
  const [formDeuda, setFormDeuda] = useState({ concepto: '', monto: '', fechaLimite: '' });
  const [formRetiro, setFormRetiro] = useState({ socio: 'Davilson', monto: '' });
  const [formTransfBoveda, setFormTransfBoveda] = useState({ socio: 'Davilson', monto: '', motivo: 'Transferencia de ahorro Bóveda' });
  const [formGastoBoveda, setFormGastoBoveda] = useState({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Transferencia' });

  const [modalInyectar, setModalInyectar] = useState(false);
  const [formInyectar, setFormInyectar] = useState({ monto: '', motivo: 'Aporte de Capital Propio', notas: '' });
  const [modalDistribuir, setModalDistribuir] = useState(false);
  const [formDistribuir, setFormDistribuir] = useState({ boveda: '', operacion: '', davilson: '', santiago: '' });


  // === FETCH INICIAL DE DATOS CON ORDEN CRONOLÓGICO ESTRICTO ===
  const fetchData = useCallback(async () => {
    try {
      const [ing, gas, gf, tdc, deu, ret, tf, cl, audit, configData, transfData] = await Promise.all([
        supabase.from('finanzas_ingresos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_gastos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_gastos_fijos').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_tdc').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_deudas').select('*').order('created_at', { ascending: false }),
        supabase.from('finanzas_retiros').select('*').order('created_at', { ascending: false }),
        supabase.from('tareas').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('historial_auditoria').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('finanzas_config').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('finanzas_transferencias_boveda').select('*').order('created_at', { ascending: false })
      ]);

      if (audit && audit.data) setAuditLogs(audit.data);

      if (configData && configData.data) {
        setPorcentajeBoveda(Number(configData.data.boveda_ahorro_porcentaje) || 15);
        setTempPct(Number(configData.data.boveda_ahorro_porcentaje) || 15);
        setSaldoBoveda(Number(configData.data.boveda_saldo_acumulado) || 0);
      }
      
      if (transfData && transfData.data) {
        setTransferenciasBoveda(transfData.data);
      }

      const mapIng = (r) => ({ id: r.id, concepto: r.concepto, cliente: r.cliente, tipo: r.tipo, monto: Number(r.monto), fecha: r.fecha, created_at: r.created_at || r.fecha });
      const mapGas = (r) => ({ id: r.id, concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), fecha: r.fecha, metodo: r.metodo, created_at: r.created_at || r.fecha });
      const mapFij = (r) => ({ id: r.id, concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), fechaInicio: r.fecha_inicio, diaCobro: r.dia_cobro, created_at: r.created_at });
      const mapTdc = (r) => ({ id: r.id, concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), fecha: r.fecha, created_at: r.created_at });
      const mapDeu = (r) => ({ id: r.id, concepto: r.concepto, monto: Number(r.monto), fechaLimite: r.fecha_limite, created_at: r.created_at });
      const mapRet = (r) => ({ id: r.id, socio: r.socio, monto: Number(r.monto), fecha: r.fecha, created_at: r.created_at || r.fecha });
      const mapTfIngreso = (r) => ({ id: r.id, cliente_id: r.cliente_id, concepto: r.descripcion || r.categoria, cliente: 'Directorio', tipo: 'Operativo', monto: Number(r.monto), fecha: r.fecha_pago || r.created_at, created_at: r.created_at || r.fecha_pago });
      const mapTfGasto = (r) => ({ id: r.id, concepto: r.descripcion || r.categoria, categoria: r.categoria, monto: Number(r.monto), fecha: r.fecha_pago || r.created_at, metodo: 'Transferencia', created_at: r.created_at || r.fecha_pago });

      let fetchedIngresos = ing.data ? ing.data.map(mapIng) : [];
      let fetchedGastos = gas.data ? gas.data.map(mapGas) : [];

      if (tf.data) {
        const tfIngresos = tf.data.filter(t => t.tipo === 'ingreso').map(mapTfIngreso);
        const tfGastos = tf.data.filter(t => t.tipo === 'gasto').map(mapTfGasto);
        fetchedIngresos = [...fetchedIngresos, ...tfIngresos];
        fetchedGastos = [...fetchedGastos, ...tfGastos];
      }

      // Sincronización automática con clientes con pago activo
      if (cl.data) {
        cl.data.forEach(row => {
          const planPagos = row.plan_pagos || [];
          const cuotasPendientes = planPagos.filter(p => p.estado === 'Pendiente');
          const isPagado100 = planPagos.length > 0 && cuotasPendientes.length === 0;

          const hoy = new Date();
          const mesActual = hoy.getMonth();
          const añoActual = hoy.getFullYear();
          const historialPagos = row.historial_pagos || [];
          const haPagadoEsteMes = historialPagos.some(p => {
            if (!p.fecha) return false;
            const [year, month] = p.fecha.split('-');
            return Number(month) - 1 === mesActual && Number(year) === añoActual;
          });

          if ((isPagado100 || haPagadoEsteMes) && row.contrato_valor) {
            const hasTx = fetchedIngresos.some(i => i.cliente_id === row.id || (i.concepto && i.concepto.includes(row.negocio_nombre)));
            if (!hasTx) {
              fetchedIngresos.push({
                id: 'virtual_' + row.id,
                cliente_id: row.id,
                concepto: `Cobro mensual - ${row.negocio_nombre || 'Cliente'}`,
                cliente: 'Directorio (Sincronizado)',
                tipo: 'Operativo',
                monto: Number(row.contrato_valor) || 0,
                fecha: new Date().toISOString().split('T')[0],
                created_at: row.created_at || new Date().toISOString()
              });
            }
          }
        });
      }

      setIngresos(fetchedIngresos);
      setGastos(fetchedGastos);
      setGastosFijos(gf.data ? gf.data.map(mapFij) : []);
      setComprasTDC(tdc.data ? tdc.data.map(mapTdc) : []);
      setDeudasPendientes(deu.data ? deu.data.map(mapDeu) : []);
      setRetiros(ret.data ? ret.data.map(mapRet) : []);

    } catch (err) {
      console.error('Error fetching finanzas', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // === GUARDAR PORCENTAJE DE BÓVEDA ===
  const handleSavePorcentaje = async () => {
    const val = Number(tempPct);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Por favor ingresa un porcentaje válido entre 0 y 100.');
      return;
    }
    setPorcentajeBoveda(val);
    setIsEditingPct(false);
    try { 
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_ahorro_porcentaje: val }]); 
      
      const newLog = {
        tipo: 'ajuste_porcentaje',
        concepto: `Ajuste de Porcentaje de Bóveda: Cambiado a ${val}%. Aplicable a ingresos a partir de esta fecha/hora.`,
        monto: 0,
        destino: user?.email || 'Admin'
      };
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert([newLog]).select();
      if (data && data.length > 0) {
        setTransferenciasBoveda([data[0], ...transferenciasBoveda]);
      }
    } catch (e) {}
    logAuditoria(user, 'Finanzas', 'EDITAR', `Porcentaje de Bóveda actualizado a ${val}%`);
  };

  // === HELPER: Días hasta cobro recurrente ===
  const getDaysUntil = (diaCobro) => {
    const today = new Date();
    const currentDay = today.getDate();
    let days = diaCobro - currentDay;
    if (days < 0) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      days = (daysInMonth - currentDay) + Number(diaCobro);
    }
    return days;
  };

  // === MOTOR LÓGICO Y CÁLCULOS (useMemo) ===
  
  const { 
    totalIngresos, totalGastosEfectivo, utilidadBrutaMes, 
    cajaDisponible, fondoTotalBoveda, 
    saldoDavilson, saldoSantiago,
    totalTDC
  } = useMemo(() => {
    const tIngresos = (ingresos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    // Gastos que afectan caja general (Cuentas que no son Bóveda ni Socios)
    const tGastosVar = (gastos || []).filter(g => !['Bóveda de Agencia', 'Cuenta Davilson', 'Cuenta Santiago'].includes(g.metodo)).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const tGastosFijos = (gastosFijos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const tGastosCaja = tGastosVar + tGastosFijos; 
    
    // Gastos pagados con fondos específicos
    const gastosDavilson = (gastos || []).filter(g => g.metodo === 'Cuenta Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const gastosSantiago = (gastos || []).filter(g => g.metodo === 'Cuenta Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Transferencias desde Bóveda a socios (modelo anterior)
    const transfDavilson = (transferenciasBoveda || []).filter(t => t.socio === 'Davilson' || (t.tipo === 'transferencia' && t.destino === 'Davilson')).reduce((acc, curr) => acc + Number(curr.monto), 0);
    const transfSantiago = (transferenciasBoveda || []).filter(t => t.socio === 'Santiago' || (t.tipo === 'transferencia' && t.destino === 'Santiago')).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // NUEVO: Distribuciones manuales desde Caja General
    const distribucionesCaja = (transferenciasBoveda || []).filter(t => t.tipo === 'distribucion_caja');
    const distBoveda = distribucionesCaja.filter(d => d.destino === 'Bóveda').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distOperacion = distribucionesCaja.filter(d => d.destino === 'Fondo Operación').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distDavilson = distribucionesCaja.filter(d => d.destino === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const distSantiago = distribucionesCaja.filter(d => d.destino === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    const tDistribuciones = distBoveda + distOperacion + distDavilson + distSantiago;

    const tTDC = (comprasTDC || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Utilidad Bruta (Ingresos - Gastos operacionales de caja)
    const uBruta = tIngresos - tGastosCaja;
    
    // CAJA GENERAL DISPONIBLE (U. Bruta - lo que se ha distribuido manual)
    const cDisponible = uBruta - tDistribuciones;

    // Retiros Socios
    const retirosDavilson = (retiros || []).filter(r => r.socio === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const retirosSantiago = (retiros || []).filter(r => r.socio === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);

    // Saldo Final Bóveda (ahora manual)
    const fBovedaTotal = saldoBoveda; // Ya viene del estado global

    // Saldo Socios (Transferencias/Distribuciones a favor - Retiros - Gastos personales)
    const sDavilson = distDavilson + transfDavilson - retirosDavilson - gastosDavilson;
    const sSantiago = distSantiago + transfSantiago - retirosSantiago - gastosSantiago;

    return {
      totalIngresos: tIngresos,
      totalGastosEfectivo: tGastosCaja,
      utilidadBrutaMes: uBruta,
      cajaDisponible: cDisponible,
      fondoTotalBoveda: fBovedaTotal,
      saldoDavilson: sDavilson,
      saldoSantiago: sSantiago,
      totalTDC: tTDC
    };
  }, [ingresos, gastos, gastosFijos, comprasTDC, retiros, transferenciasBoveda, saldoBoveda]);

  // === LIBRO MAYOR: MOVIMIENTOS UNIFICADOS ORDENADOS POR CREATED_AT DESC ===
  const libroMayor = useMemo(() => {
    const list = [];

    // 1. Ingresos
    ingresos.forEach(i => {
      list.push({
        id: 'ing_' + i.id,
        fecha: i.fecha || 'Reciente',
        created_at: i.created_at || i.fecha,
        tipo: 'Ingreso',
        categoria: i.tipo || 'Operativo',
        concepto: i.concepto,
        origenDestino: i.cliente || 'Caja General',
        monto: Number(i.monto),
        esPositivo: true
      });
    });

    // 2. Gastos
    gastos.forEach(g => {
      const isBoveda = g.metodo === 'Bóveda de Agencia';
      list.push({
        id: 'gas_' + g.id,
        fecha: g.fecha || 'Reciente',
        created_at: g.created_at || g.fecha,
        tipo: isBoveda ? 'Gasto Bóveda' : 'Gasto General',
        categoria: g.categoria || 'Variables',
        concepto: g.concepto,
        origenDestino: g.metodo || 'Caja General',
        monto: Number(g.monto),
        esPositivo: false
      });
    });

    // 3. Retiros de socios
    retiros.forEach(r => {
      list.push({
        id: 'ret_' + r.id,
        fecha: r.fecha || 'Reciente',
        created_at: r.created_at || r.fecha,
        tipo: 'Retiro Socio',
        categoria: 'Reparto Utilidades',
        concepto: `Retiro de utilidades - ${r.socio}`,
        origenDestino: `Cuenta ${r.socio}`,
        monto: Number(r.monto),
        esPositivo: false
      });
    });

    // 4. Transferencias de Bóveda y Caja Manual
    transferenciasBoveda.forEach(t => {
      if (t.tipo === 'ajuste_porcentaje') return; // Ignorar logs administrativos

      const esDeposito = t.tipo === 'deposito_manual';
      const label = esDeposito ? '[DEPÓSITO]' : '[RETIRO/DISTR]';
      const conceptoFinal = t.concepto || t.motivo || '';

      list.push({
        id: 'trb_' + t.id,
        fecha: t.fecha || 'Reciente',
        created_at: t.created_at || t.fecha,
        tipo: t.tipo === 'distribucion_caja' ? 'Distr. Caja' : 'Mov. Bóveda',
        categoria: 'Mov. Interno',
        concepto: `${label} ${conceptoFinal}`,
        origenDestino: t.destino || t.socio || 'Bóveda',
        monto: Number(t.monto),
        esTransferencia: !esDeposito, // Red/Blue for withdrawal/distribution
        esPositivo: esDeposito // Green for deposits
      });
    });

    // Orden cronológico estricto por timestamp (created_at DESC)
    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || a.fecha).getTime();
      const timeB = new Date(b.created_at || b.fecha).getTime();
      return timeB - timeA;
    });
  }, [ingresos, gastos, retiros, transferenciasBoveda]);

  // Filtrado del Libro Mayor
  const filteredLibroMayor = useMemo(() => {
    return libroMayor.filter(m => {
      if (filtroLibro === 'ingresos' && m.tipo !== 'Ingreso') return false;
      if (filtroLibro === 'gastos' && !['Gasto General', 'Gasto Bóveda'].includes(m.tipo)) return false;
      if (filtroLibro === 'boveda_socios' && !['Gasto Bóveda', 'Retiro Socio', 'Transf. Bóveda'].includes(m.tipo)) return false;

      if (searchLibro) {
        const query = searchLibro.toLowerCase();
        return (
          m.concepto?.toLowerCase().includes(query) ||
          m.categoria?.toLowerCase().includes(query) ||
          m.origenDestino?.toLowerCase().includes(query) ||
          m.tipo?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [libroMayor, filtroLibro, searchLibro]);

  // === MANEJADORES DE ACCIONES ===

  
  const handleInyectar = async (e) => {
    e.preventDefault();
    const m = Number(formInyectar.monto);
    if (m <= 0) return;
    
    const conceptoFinal = `${formInyectar.motivo}${formInyectar.notas ? ' - ' + formInyectar.notas : ''}`;
    const nuevoSaldo = saldoBoveda + m;
    
    try {
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
      setSaldoBoveda(nuevoSaldo);
      
      const newLog = {
        tipo: 'deposito_manual',
        concepto: conceptoFinal,
        monto: m,
        destino: 'Bóveda'
      };
      
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert([newLog]).select();
      if (data && data.length > 0) {
        setTransferenciasBoveda([data[0], ...transferenciasBoveda]);
      }
      
      logAuditoria(user, 'Finanzas', 'CREAR', `Inyección a Bóveda: ${conceptoFinal} - ${m}`);
      alert('Fondos inyectados a la bóveda con éxito.');
    } catch (err) {
      alert('Error inyectando fondos: ' + err.message);
    }
    
    setModalInyectar(false);
    setFormInyectar({ monto: '', motivo: 'Aporte de Capital Propio', notas: '' });
  };

  const handleDistribuir = async (e) => {
    e.preventDefault();
    const mBoveda = Number(formDistribuir.boveda) || 0;
    const mOperacion = Number(formDistribuir.operacion) || 0;
    const mDavilson = Number(formDistribuir.davilson) || 0;
    const mSantiago = Number(formDistribuir.santiago) || 0;
    
    const suma = mBoveda + mOperacion + mDavilson + mSantiago;
    if (suma <= 0) return alert('Ingresa al menos un monto para distribuir.');
    if (suma > cajaDisponible) return alert('La suma de las partes (' + formatCOP(suma) + ') supera el saldo de Caja General (' + formatCOP(cajaDisponible) + ').');
    
    try {
      const logs = [];
      if (mBoveda > 0) {
        logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mBoveda, destino: 'Bóveda' });
        const nuevoSaldo = saldoBoveda + mBoveda;
        await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
        setSaldoBoveda(nuevoSaldo);
      }
      if (mOperacion > 0) logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mOperacion, destino: 'Fondo Operación' });
      if (mDavilson > 0) logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mDavilson, destino: 'Davilson' });
      if (mSantiago > 0) logs.push({ tipo: 'distribucion_caja', concepto: 'Distribución de Caja General', monto: mSantiago, destino: 'Santiago' });
      
      const { data } = await supabase.from('finanzas_transferencias_boveda').insert(logs).select();
      if (data && data.length > 0) {
        setTransferenciasBoveda([...data, ...transferenciasBoveda]);
      }
      
      logAuditoria(user, 'Finanzas', 'CREAR', `Distribución manual de Caja General: ${suma}`);
      alert('Distribución realizada con éxito.');
    } catch (err) {
      alert('Error distribuyendo fondos: ' + err.message);
    }
    
    setModalDistribuir(false);
    setFormDistribuir({ boveda: '', operacion: '', davilson: '', santiago: '' });
  };

  const handleIngreso = async (e) => {
    e.preventDefault();
    const montoNum = Number(formIngreso.monto);
    const payload = { concepto: formIngreso.concepto, cliente: formIngreso.cliente, tipo: formIngreso.tipo, monto: montoNum, fecha: formIngreso.fecha };
    const { data } = await supabase.from('finanzas_ingresos').insert([payload]).select();
    if (data && data.length > 0) {
      setIngresos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...ingresos]);
      logAuditoria(user, 'Finanzas', 'CREAR', `Nuevo Ingreso: ${payload.concepto} - ${montoNum}`);
      
      // Bóveda: Añadir Ahorro automático removido (nuevo modelo manual).
      
      // VERCEL SERVERLESS TRIGGERS (COBRO)
        sendTelegramNotification(
          `💰 <b>NUEVO INGRESO REGISTRADO</b>\n\n<b>Concepto:</b> ${payload.concepto}\n<b>Cliente:</b> ${payload.cliente}\n<b>Tipo:</b> ${payload.tipo}\n<b>Monto:</b> ${Number(payload.monto).toLocaleString('es-CO')}\n<b>Fecha:</b> ${payload.fecha}`,
          'group'
        );

        // CALENDAR: crear recordatorio si hay fecha futura de cobro
        if (payload.fecha) {
          const fechaISO = new Date(payload.fecha + 'T08:00:00').toISOString();
          const endISO = new Date(payload.fecha + 'T09:00:00').toISOString();
          createCalendarEvent({
            title: `💰 Cobro: ${payload.concepto} - ${payload.cliente}`,
            description: `Monto: ${Number(payload.monto).toLocaleString('es-CO')} | Tipo: ${payload.tipo}`,
            startDateTime: fechaISO,
            endDateTime: endISO,
          });
        }
    }
    setModalIngreso(false);
  };

  const handleGasto = async (e) => {
    e.preventDefault();
    const payload = { concepto: formGasto.concepto, categoria: formGasto.categoria, monto: Number(formGasto.monto), fecha: formGasto.fecha };
    if (formGasto.metodo === 'Tarjeta de Crédito (TDC)' || formGasto.metodo === 'Tarjeta de Crédito') {
      const { data } = await supabase.from('finanzas_compras_tdc').insert([payload]).select();
      if (data && data.length > 0) setComprasTDC([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...comprasTDC]);
    } else {
      payload.metodo = formGasto.metodo;
      const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
      if (data && data.length > 0) {
        setGastos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...gastos]);
        logAuditoria(user, 'Finanzas', 'CREAR', `Nuevo Gasto (${payload.metodo}): ${payload.concepto} - $${payload.monto}`);
      }
    }
    setModalGasto(false);
  };

  const handleFijo = async (e) => {
    e.preventDefault();
    const payload = { concepto: formFijo.concepto, categoria: formFijo.categoria, monto: Number(formFijo.monto), fecha_inicio: formFijo.fechaInicio, dia_cobro: formFijo.diaCobro };
    const { data } = await supabase.from('finanzas_gastos_fijos').insert([payload]).select();
    if (data && data.length > 0) {
      setGastosFijos([...gastosFijos, { id: data[0].id, created_at: data[0].created_at, concepto: payload.concepto, categoria: payload.categoria, monto: payload.monto, fechaInicio: payload.fecha_inicio, diaCobro: payload.dia_cobro }]);
      logAuditoria(user, 'Finanzas', 'CREAR', `Nuevo Gasto Fijo: ${payload.concepto} - $${payload.monto}`);
    }
    setModalFijo(false);
  };

  const handleDeuda = async (e) => {
    e.preventDefault();
    const payload = { concepto: formDeuda.concepto, monto: Number(formDeuda.monto), fecha_limite: formDeuda.fechaLimite };
    const { data } = await supabase.from('finanzas_deudas').insert([payload]).select();
    if (data && data.length > 0) setDeudasPendientes([...deudasPendientes, { id: data[0].id, created_at: data[0].created_at, concepto: payload.concepto, monto: payload.monto, fechaLimite: payload.fecha_limite }]);
    setModalDeuda(false);
  };

  const handleRetiro = async (e) => {
    e.preventDefault();
    if (Number(formRetiro.monto) <= 0) return;
    const payload = { socio: formRetiro.socio, monto: Number(formRetiro.monto), fecha: new Date().toISOString().split('T')[0] };
    const { data } = await supabase.from('finanzas_retiros').insert([payload]).select();
    if (data && data.length > 0) {
      setRetiros([{ id: data[0].id, created_at: data[0].created_at, socio: payload.socio, monto: payload.monto, fecha: payload.fecha }, ...retiros]);
      logAuditoria(user, 'Finanzas', 'CREAR', `Retiro de utilidades: ${payload.socio} - $${payload.monto}`);
    }
    setModalRetiro(false);
  };

  // Transferencia de Bóveda a Socio
  const handleTransferenciaBoveda = async (e) => {
    e.preventDefault();
    const montoNum = Number(formTransfBoveda.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa un monto válido para transferir.');
      return;
    }

    const newTransf = {
      id: Date.now().toString(),
      socio: formTransfBoveda.socio,
      monto: montoNum,
      motivo: formTransfBoveda.motivo || `Transferencia Bóveda → ${formTransfBoveda.socio}`,
      fecha: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const updated = [newTransf, ...transferenciasBoveda];
    setTransferenciasBoveda(updated);
    localStorage.setItem('gloss_transferencias_boveda', JSON.stringify(updated));

    logAuditoria(
      user,
      'Finanzas',
      'CREAR',
      `Transferencia desde Bóveda a ${formTransfBoveda.socio} por $${montoNum}`
    );

    setModalBoveda(false);
    setFormTransfBoveda({ socio: 'Davilson', monto: '', motivo: 'Transferencia de ahorro Bóveda' });
  };

  // Gasto directo desde Bóveda
  const handleGastoBoveda = async (e) => {
    e.preventDefault();
    const montoNum = Number(formGastoBoveda.monto);
    if (isNaN(montoNum) || montoNum <= 0) return;

    const payload = { concepto: formGastoBoveda.concepto, categoria: formGastoBoveda.categoria, monto: montoNum, fecha: formGastoBoveda.fecha, metodo: 'Bóveda de Agencia' };
    const nuevoSaldo = saldoBoveda - montoNum;

    try {
      const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
      await supabase.from('finanzas_config').upsert([{ id: 'default', boveda_saldo_acumulado: nuevoSaldo }]);
      if (data && data.length > 0) {
        setGastos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...gastos]);
        setSaldoBoveda(nuevoSaldo);
        logAuditoria(user, 'Finanzas', 'CREAR', `Nuevo Gasto Bóveda: ${payload.concepto} - ${montoNum}`);
      }
    } catch(err) {}

    setModalBoveda(false);
    setFormGastoBoveda({ concepto: '', categoria: CATEGORIAS_GASTOS[0], monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Transferencia' });
  };

  const pagarDeudaTercero = (deuda) => {
    const nowIso = new Date().toISOString();
    setGastos([{ id: Date.now(), concepto: `Pago Deuda: ${deuda.concepto}`, categoria: 'Impuestos', monto: deuda.monto, fecha: nowIso.split('T')[0], created_at: nowIso }, ...gastos]);
    setDeudasPendientes(deudasPendientes.filter(d => d.id !== deuda.id));
  };

  const pagarTarjetaCompleta = async () => {
    if (comprasTDC.length === 0) return;
    const tTDC = comprasTDC.reduce((acc, curr) => acc + Number(curr.monto), 0);
    const dateStr = new Date().toISOString().split('T')[0];
    const payload = { concepto: 'Pago Tarjeta de Crédito', categoria: 'Intereses', monto: tTDC, fecha: dateStr, metodo: 'Efectivo/Transferencia' };
    
    const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
    if (data && data.length > 0) setGastos([{ id: data[0].id, created_at: data[0].created_at, ...payload }, ...gastos]);

    for (const c of comprasTDC) {
      await supabase.from('finanzas_compras_tdc').delete().eq('id', c.id);
    }
    setComprasTDC([]);
  };

  const deleteItem = async (tabla, setter, list, id) => {
    if (!(isSuperAdmin ?? false)) {
      alert("No tienes permisos de Super Admin para eliminar transacciones.");
      return;
    }
    await supabase.from(tabla).delete().eq('id', id);
    logAuditoria(user, 'Finanzas', 'ELIMINAR', `Eliminado registro de ${tabla}`);
    setter(list.filter(item => item.id !== id));
  };

  // Formato Moneda
  const formatCOP = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  // === COMPONENTE TARJETA DE SOCIO ===
  const SocioCard = ({ nombre, saldo }) => {
    const isNegative = saldo < 0;
    return (
      <div className={`p-6 rounded-3xl border ${isNegative ? 'border-red-300 bg-red-50/70 dark:border-red-900/60 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black'} flex flex-col justify-between shadow-sm`}>
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gloss-pink/30 flex items-center justify-center border border-gloss-pink text-gloss-burgundy font-bold">
                {nombre[0]}
              </div>
              <div>
                <h4 className="font-zodiak font-bold text-lg leading-tight">{nombre}</h4>
                <p className="text-xs text-gray-500">Cuenta Corriente Socio</p>
              </div>
            </div>
            {isNegative ? (
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-semibold flex items-center gap-1">
                <ArrowDownCircle size={12} /> Saldo Negativo
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs font-semibold flex items-center gap-1">
                <ArrowUpCircle size={12} /> Saldo Disponible
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Actual a Favor</p>
          <h3 className={`text-3xl font-bold font-zodiak ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCOP(saldo)}
          </h3>
        </div>
        <button 
          onClick={() => { setFormRetiro({ socio: nombre, monto: '' }); setModalRetiro(true); }} 
          className="mt-6 w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Wallet size={15} /> Registrar Retiro / Anticipo
        </button>
      </div>
    );
  };

  const ultimoAjuste = transferenciasBoveda.find(t => t.tipo === 'ajuste_porcentaje');

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Dashboard Financiero</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Control maestro contable, flujos de caja, bóveda de agencia y libro mayor cronológico</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModalGasto(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold transition-colors text-xs">
            <TrendingDown size={15} /> Añadir Gasto
          </button>
          <button onClick={() => setModalIngreso(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white font-bold transition-colors shadow-sm text-xs">
            <Plus size={15} /> Añadir Ingreso
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: BÓVEDA & SOCIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TARJETA BÓVEDA DE AGENCIA */}
        <div className="p-6 rounded-3xl border border-gloss-burgundy bg-gloss-burgundy text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10"><Landmark size={180} /></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl"><PiggyBank size={24} /></div>
                <div>
                  <h3 className="font-zodiak font-bold text-xl">Bóveda de Agencia</h3>
                  <p className="text-xs text-white/80">Fondo de Ahorro & Reinversión</p>
                </div>
              </div>

              {/* Configuración Dinámica de Porcentaje */}
              <div className="flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-xl border border-white/20">
                {isEditingPct ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={tempPct}
                      onChange={(e) => setTempPct(e.target.value)}
                      className="w-12 px-1 py-0.5 text-xs text-black font-bold rounded bg-white outline-none text-center"
                    />
                    <span className="text-xs font-bold">%</span>
                    <button onClick={handleSavePorcentaje} className="p-1 hover:text-green-300 transition-colors" title="Guardar"><Check size={13} /></button>
                    <button onClick={() => { setIsEditingPct(false); setTempPct(porcentajeBoveda); }} className="p-1 hover:text-red-300 transition-colors" title="Cancelar"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span>{porcentajeBoveda}% Ahorro</span>
                    {(isSuperAdmin ?? false) && (<button onClick={() => setIsEditingPct(true)} className="p-0.5 hover:text-gloss-pink transition-colors" title="Editar porcentaje"><Pencil size={12} /></button>)}
                  </div>
                  )}
                  {ultimoAjuste && (
                    <p className="text-[10px] text-white/70 mt-3 italic leading-tight border-t border-white/20 pt-2">
                      Vigente desde: {new Date(ultimoAjuste.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}<br/>
                      <span className="opacity-80">Los ingresos anteriores conservan su corte original.</span>
                    </p>
                  )}
                </div>
              </div>
  
              <div className="mt-4">
              <p className="text-white/80 text-xs mb-1">Saldo Total Protegido en Bóveda</p>
              <h2 className="text-4xl font-bold font-zodiak">{formatCOP(fondoTotalBoveda)}</h2>
            </div>
          </div>
          
          <div className="mt-6 relative z-10 space-y-3">
              <button 
                onClick={() => setModalInyectar(true)}
                className="w-full flex items-center justify-center gap-2 bg-white text-gloss-burgundy font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
              >
                + Inyectar Fondos
              </button>
              <button  
              onClick={() => {
                setTabBoveda('transferir');
                setModalBoveda(true);
              }}
              className="w-full bg-white text-gloss-burgundy hover:bg-white/90 font-bold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs"
            >
              <Send size={15} /> Movimientos y Gastos de Bóveda
            </button>

            
          </div>
        </div>

        {/* TARJETAS DE SOCIOS */}
        <SocioCard nombre="Davilson" saldo={saldoDavilson} />
        <SocioCard nombre="Santiago" saldo={saldoSantiago} />
      </div>

      {/* SECCIÓN 2: RENDIMIENTO MES ACTUAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><TrendingUp size={15} className="text-green-500" /> Ingresos Brutos (Caja)</p>
          <h3 className="text-2xl font-bold font-zodiak text-gray-900 dark:text-white">{formatCOP(totalIngresos)}</h3>
        </div>
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><TrendingDown size={15} className="text-red-500" /> Gastos Ejecutados (Caja)</p>
          <h3 className="text-2xl font-bold font-zodiak text-gray-900 dark:text-white">{formatCOP(totalGastosEfectivo)}</h3>
        </div>
        <div className={`p-5 rounded-2xl border ${utilidadBrutaMes >= 0 ? 'border-green-200 bg-green-50/60 dark:bg-green-900/10' : 'border-red-200 bg-red-50/60 dark:bg-red-900/10'} shadow-sm`}>
          <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Caja General / Disponible</p>
                <h3 className={`text-2xl font-bold font-zodiak ${cajaDisponible >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCOP(cajaDisponible)}</h3>
              </div>
              <button onClick={() => setModalDistribuir(true)} className="bg-gloss-burgundy hover:bg-red-800 text-white text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded-xl transition-colors shadow flex items-center gap-1">
                Distribuir
              </button>
            </div>
        </div>
      </div>

      {/* SECCIÓN 3: LIBRO MAYOR / HISTORIAL UNIFICADO DE MOVIMIENTOS */}
      <div className="bg-white dark:bg-gloss-black rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-gloss-burgundy dark:text-gloss-pink font-bold">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-zodiak font-bold text-lg text-gray-900 dark:text-white">
                Libro Mayor • Historial de Movimientos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Registro cronológico exacto de ingresos, gastos, retiros y traspasos de bóveda
              </p>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl p-1 bg-white dark:bg-gray-800 text-xs font-bold">
              <button 
                onClick={() => setFiltroLibro('todos')} 
                className={`px-3 py-1 rounded-lg transition-colors ${filtroLibro === 'todos' ? 'bg-gloss-burgundy text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
              >
                Todos ({libroMayor.length})
              </button>
              <button 
                onClick={() => setFiltroLibro('ingresos')} 
                className={`px-3 py-1 rounded-lg transition-colors ${filtroLibro === 'ingresos' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
              >
                Ingresos
              </button>
              <button 
                onClick={() => setFiltroLibro('gastos')} 
                className={`px-3 py-1 rounded-lg transition-colors ${filtroLibro === 'gastos' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
              >
                Gastos
              </button>
              <button 
                onClick={() => setFiltroLibro('boveda_socios')} 
                className={`px-3 py-1 rounded-lg transition-colors ${filtroLibro === 'boveda_socios' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
              >
                Bóveda & Socios
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar movimiento..."
                value={searchLibro}
                onChange={(e) => setSearchLibro(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-gloss-burgundy"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-gray-50/90 dark:bg-gray-900/80 text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold text-[10px] sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4">Fecha y Hora Exacta</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Concepto</th>
                <th className="py-3.5 px-4">Origen / Destino</th>
                <th className="py-3.5 px-4 text-right">Monto (COP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredLibroMayor.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No se encontraron movimientos registrados con el filtro actual.
                  </td>
                </tr>
              ) : (
                (filteredLibroMayor || []).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatTimestamp(m.created_at, m.fecha)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        m.tipo === 'Ingreso' 
                          ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-200' 
                          : m.tipo === 'Gasto General'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200'
                          : m.tipo === 'Gasto Bóveda'
                          ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200'
                          : m.tipo === 'Transf. Bóveda'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200'
                          : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200'
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">{m.categoria}</td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{m.concepto}</td>
                    <td className="py-3 px-4 text-gray-500">{m.origenDestino}</td>
                    <td className={`py-3 px-4 font-black text-right whitespace-nowrap ${
                      m.esPositivo 
                        ? 'text-green-600 dark:text-green-400' 
                        : m.esTransferencia 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {m.esPositivo ? `+${formatCOP(m.monto)}` : m.esTransferencia ? `↔ ${formatCOP(m.monto)}` : `-${formatCOP(m.monto)}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 4: CONTROL DE DEUDAS (TDC & Terceros) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjetas de Crédito */}
        <div className="bg-white dark:bg-gloss-black rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-red-50/50 dark:bg-red-900/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CreditCard className="text-red-500" size={20} />
              <h3 className="font-zodiak font-bold text-lg text-red-600 dark:text-red-400">Estado TDC (Crédito)</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Deuda Acumulada</p>
              <p className="font-bold text-red-600">{formatCOP(totalTDC)}</p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/30 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500 px-2">No afecta utilidad hasta pagarse.</span>
            <button onClick={pagarTarjetaCompleta} disabled={comprasTDC.length === 0} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors ${comprasTDC.length > 0 ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              Pagar Tarjeta
            </button>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {comprasTDC.length === 0 && <tr><td className="p-6 text-center text-gray-500">No hay deudas en TDC</td></tr>}
                {(comprasTDC || []).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3"><p className="font-medium">{c.concepto}</p><span className="text-xs text-gray-500">{c.fecha}</span></td>
                    <td className="p-3 font-medium text-red-500 text-right">-{formatCOP(c.monto)}</td>
                    <td className="p-3 text-center"><button onClick={() => deleteItem('finanzas_compras_tdc', setComprasTDC, comprasTDC, c.id)} className={!(isSuperAdmin ?? false) ? "hidden" : "text-gray-400 hover:text-red-500"}><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuentas por Pagar (Terceros) */}
        <div className="bg-white dark:bg-gloss-black rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-orange-50/50 dark:bg-orange-900/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="text-orange-500" size={20} />
              <h3 className="font-zodiak font-bold text-lg text-orange-600 dark:text-orange-400">Cuentas por Pagar</h3>
            </div>
            <button onClick={() => setModalDeuda(true)} className="text-xs px-3 py-1.5 rounded-xl font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 transition-colors flex items-center gap-1">
              <Plus size={14} /> Registrar
            </button>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deudasPendientes.length === 0 && <tr><td className="p-6 text-center text-gray-500">Sin deudas a terceros</td></tr>}
                {(deudasPendientes || []).map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3">
                      <p className="font-medium">{d.concepto}</p>
                      <span className="text-xs text-orange-500 font-medium">Vence: {d.fechaLimite}</span>
                    </td>
                    <td className="p-3 font-medium text-orange-500 text-right">{formatCOP(d.monto)}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => pagarDeudaTercero(d)} title="Liquidar/Pagar" className="text-gray-400 hover:text-green-500"><CheckCircle size={18} /></button>
                        <button onClick={() => deleteItem('finanzas_deudas', setDeudasPendientes, deudasPendientes, d.id)} className={!(isSuperAdmin ?? false) ? "hidden" : "text-gray-400 hover:text-red-500"}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECCIÓN 5: GASTOS FIJOS (AUTOMÁTICOS) */}
      <div className="bg-white dark:bg-gloss-black rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
          <div>
            <h3 className="font-zodiak font-bold text-lg flex items-center gap-2"><RefreshCw className="text-blue-500" size={18} /> Gastos Fijos (Automáticos)</h3>
            <p className="text-xs text-gray-400">Gastos mensuales recurrentes sincronizados con la base de datos</p>
          </div>
          <button onClick={() => setModalFijo(true)} className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl"><Plus size={14}/> Añadir Fijo</button>
        </div>
        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {gastosFijos.length === 0 && <tr><td className="p-6 text-center text-gray-400">No hay gastos fijos configurados</td></tr>}
              {(gastosFijos || []).map(f => {
                const days = getDaysUntil(f.diaCobro);
                const alert = days <= 5;
                return (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3">
                      <p className="font-medium">{f.concepto}</p>
                      <span className="text-xs text-gray-500">{f.categoria}</span>
                    </td>
                    <td className="p-3">
                      {alert ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle size={12}/> En {days} {days===1?'día':'días'}</span>
                      ) : (
                        <span className="text-xs text-gray-500">Día {f.diaCobro} de cada mes</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white text-right">-{formatCOP(f.monto)}</td>
                    <td className="p-3 text-center"><button onClick={() => deleteItem('finanzas_gastos_fijos', setGastosFijos, gastosFijos, f.id)} className={!(isSuperAdmin ?? false) ? "hidden" : "text-gray-400 hover:text-red-500"}><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL DE AUDITORÍA */}
      <div className="bg-white dark:bg-gloss-black rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowAudit(!showAudit)}
          className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-gloss-burgundy dark:text-gloss-pink" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Registro de Auditoría (Trazabilidad de Movimientos)</h3>
          </div>
          <span className="text-xs font-bold text-gray-500">{showAudit ? 'Ocultar' : 'Ver'}</span>
        </button>
        
        {showAudit && (
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Usuario</th>
                  <th className="pb-3 font-medium">Módulo</th>
                  <th className="pb-3 font-medium">Acción</th>
                  <th className="pb-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan="5" className="py-4 text-center text-gray-500">No hay registros recientes.</td></tr>
                ) : (
                  (auditLogs || []).map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{log.usuario_nombre}</td>
                      <td className="py-3 pr-4"><span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{log.modulo}</span></td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.accion === 'CREAR' ? 'bg-green-100 text-green-700' : log.accion === 'ELIMINAR' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{log.detalle}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODALES ================= */}
      
      {/* MODAL GESTIÓN DE BÓVEDA (Transferir a Socio / Gasto Bóveda) */}
      {modalBoveda && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative">
            <button onClick={() => setModalBoveda(false)} className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white">
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-gloss-burgundy/10 dark:bg-gloss-pink/10 flex items-center justify-center text-gloss-burgundy dark:text-gloss-pink">
                <PiggyBank size={20} />
              </div>
              <div>
                <h3 className="font-zodiak font-bold text-lg text-gray-900 dark:text-white">
                  Movimientos de la Bóveda
                </h3>
                <p className="text-xs text-gray-500">Saldo Disponible: <strong className="text-gloss-burgundy dark:text-gloss-pink">{formatCOP(fondoTotalBoveda)}</strong></p>
              </div>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 mb-5 gap-2">
              <button
                type="button"
                onClick={() => setTabBoveda('transferir')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                  tabBoveda === 'transferir' 
                    ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                A) Transferir a Socio
              </button>
              <button
                type="button"
                onClick={() => setTabBoveda('gasto')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                  tabBoveda === 'gasto' 
                    ? 'border-gloss-burgundy text-gloss-burgundy dark:border-gloss-pink dark:text-gloss-pink' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                B) Registrar Gasto de Bóveda
              </button>
            </div>

            {/* TAB A: Transferir a Socio */}
            {tabBoveda === 'transferir' && (
              <form onSubmit={handleTransferenciaBoveda} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Socio Receptor</label>
                  <select 
                    value={formTransfBoveda.socio} 
                    onChange={e => setFormTransfBoveda({ ...formTransfBoveda, socio: e.target.value })} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold cursor-pointer"
                  >
                    <option value="Davilson">Davilson (Cuenta Corriente)</option>
                    <option value="Santiago">Santiago (Cuenta Corriente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Monto a Transferir (COP)</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max={fondoTotalBoveda > 0 ? fondoTotalBoveda : undefined}
                    value={formTransfBoveda.monto} 
                    onChange={e => setFormTransfBoveda({ ...formTransfBoveda, monto: e.target.value })} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-lg" 
                    placeholder="0"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Este monto se descontará de la Bóveda y sumará al saldo disponible del socio.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Motivo / Concepto</label>
                  <input 
                    type="text" 
                    value={formTransfBoveda.motivo} 
                    onChange={e => setFormTransfBoveda({ ...formTransfBoveda, motivo: e.target.value })} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" 
                    placeholder="Ej. Distribución extraordinaria de ahorro"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setModalBoveda(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white text-xs font-bold hover:bg-gloss-burgundy/90 shadow-md">Confirmar Transferencia</button>
                </div>
              </form>
            )}

            {/* TAB B: Gasto de Bóveda */}
            {tabBoveda === 'gasto' && (
              <form onSubmit={handleGastoBoveda} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Concepto del Gasto</label>
                  <input 
                    required 
                    value={formGastoBoveda.concepto} 
                    onChange={e => setFormGastoBoveda({ ...formGastoBoveda, concepto: e.target.value })} 
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" 
                    placeholder="Ej: Inversión en servidor de alta capacidad"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Categoría</label>
                    <select 
                      value={formGastoBoveda.categoria} 
                      onChange={e => setFormGastoBoveda({ ...formGastoBoveda, categoria: e.target.value })} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium cursor-pointer"
                    >
                      {CATEGORIAS_GASTOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Fecha</label>
                    <input 
                      required 
                      type="date" 
                      value={formGastoBoveda.fecha} 
                      onChange={e => setFormGastoBoveda({ ...formGastoBoveda, fecha: e.target.value })} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Método de Pago</label>
                    <select 
                      value={formGastoBoveda.metodo} 
                      onChange={e => setFormGastoBoveda({ ...formGastoBoveda, metodo: e.target.value })} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium cursor-pointer"
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Monto (COP)</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      value={formGastoBoveda.monto} 
                      onChange={e => setFormGastoBoveda({ ...formGastoBoveda, monto: e.target.value })} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold" 
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setModalBoveda(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white text-xs font-bold hover:bg-gloss-burgundy/90 shadow-md">Registrar Gasto</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Ingreso */}
      {modalIngreso && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4">Añadir Ingreso</h3>
            <form onSubmit={handleIngreso} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Concepto</label><input required value={formIngreso.concepto} onChange={e=>setFormIngreso({...formIngreso, concepto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" placeholder="Ej: Abono diseño web"/></div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cliente Asociado</label><input required value={formIngreso.cliente} onChange={e=>setFormIngreso({...formIngreso, cliente: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" placeholder="Ej: TechCorp S.A."/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tipo</label><select value={formIngreso.tipo} onChange={e=>setFormIngreso({...formIngreso, tipo: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium cursor-pointer"><option>Retainer</option><option>Pagos Únicos</option><option>Abono</option></select></div>
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fecha</label><input required type="date" value={formIngreso.fecha} onChange={e=>setFormIngreso({...formIngreso, fecha: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"/></div>
              </div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto (COP)</label><input required type="number" min="0" value={formIngreso.monto} onChange={e=>setFormIngreso({...formIngreso, monto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-lg" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalIngreso(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white font-bold text-xs">Guardar Ingreso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gasto (Estricto con CATEGORIAS_GASTOS) */}
      {modalGasto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4">Añadir Gasto</h3>
            <form onSubmit={handleGasto} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Concepto</label><input required value={formGasto.concepto} onChange={e=>setFormGasto({...formGasto, concepto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" placeholder="Ej: Pauta Meta Ads"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Categoría</label>
                  <select 
                    value={formGasto.categoria} 
                    onChange={e=>setFormGasto({...formGasto, categoria: e.target.value})} 
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium cursor-pointer"
                  >
                    {CATEGORIAS_GASTOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fecha</label><input required type="date" value={formGasto.fecha} onChange={e=>setFormGasto({...formGasto, fecha: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"/></div>
              </div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Origen del Dinero</label><select value={formGasto.metodo} onChange={e=>setFormGasto({...formGasto, metodo: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-gloss-burgundy dark:text-gloss-pink cursor-pointer"><option>Caja General</option><option>Bóveda de Agencia</option><option>Cuenta Davilson</option><option>Cuenta Santiago</option><option>Tarjeta de Crédito (TDC)</option></select></div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto (COP)</label><input required type="number" min="0" value={formGasto.monto} onChange={e=>setFormGasto({...formGasto, monto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-lg" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalGasto(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white font-bold text-xs">Guardar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fijo */}
      {modalFijo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4">Añadir Gasto Recurrente</h3>
            <form onSubmit={handleFijo} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">SaaS / Concepto</label><input required value={formFijo.concepto} onChange={e=>setFormFijo({...formFijo, concepto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium" placeholder="Ej: Hostinger VPS"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Día de Cobro (1-31)</label><input required type="number" min="1" max="31" value={formFijo.diaCobro} onChange={e=>setFormFijo({...formFijo, diaCobro: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"/></div>
                <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fecha Inicio</label><input required type="date" value={formFijo.fechaInicio} onChange={e=>setFormFijo({...formFijo, fechaInicio: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"/></div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Categoría</label>
                <select 
                  value={formFijo.categoria} 
                  onChange={e=>setFormFijo({...formFijo, categoria: e.target.value})} 
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium cursor-pointer"
                >
                  {CATEGORIAS_GASTOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto (COP)</label><input required type="number" min="0" value={formFijo.monto} onChange={e=>setFormFijo({...formFijo, monto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-lg" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalFijo(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white font-bold text-xs">Guardar Fijo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deuda Terceros */}
      {modalDeuda && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4 text-orange-600">Registrar Deuda a Tercero</h3>
            <form onSubmit={handleDeuda} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Concepto / Acreedor</label><input required value={formDeuda.concepto} onChange={e=>setFormDeuda({...formDeuda, concepto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"/></div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fecha Límite Pago</label><input required type="date" value={formDeuda.fechaLimite} onChange={e=>setFormDeuda({...formDeuda, fechaLimite: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"/></div>
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto Adeudado (COP)</label><input required type="number" min="0" value={formDeuda.monto} onChange={e=>setFormDeuda({...formDeuda, monto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-lg" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalDeuda(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs">Guardar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Retiro */}
      {modalRetiro && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-3xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-1">Retiro de Capital</h3>
            <p className="text-xs text-gray-500 mb-4">Socio: <strong className="text-gray-900 dark:text-white">{formRetiro.socio}</strong></p>
            <form onSubmit={handleRetiro} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monto a retirar (COP)</label><input required type="number" min="1" value={formRetiro.monto} onChange={e=>setFormRetiro({...formRetiro, monto: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-lg" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalRetiro(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gloss-burgundy text-white font-bold text-xs">Confirmar Retiro</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


