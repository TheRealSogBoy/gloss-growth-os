import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { logAuditoria } from '../utils/audit';
import { Activity } from 'lucide-react';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, PiggyBank, Users, Wallet, 
  RefreshCw, Landmark, ArrowDownCircle, ArrowUpCircle, CreditCard, 
  Clock, CheckCircle, AlertTriangle
} from 'lucide-react';

// === Constants Removed ===

export default function Finanzas() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  // === ESTADOS (Listas de datos) ===
  
  
  
  
  
  
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [comprasTDC, setComprasTDC] = useState([]);
  const [deudasPendientes, setDeudasPendientes] = useState([]);
  const [retiros, setRetiros] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        
          // Obtener de todas las tablas (retrocompatibilidad) y de transacciones_finanzas
          const [ing, gas, gf, tdc, deu, ret, tf, cl, audit] = await Promise.all([
            supabase.from('finanzas_ingresos').select('*'),
            supabase.from('finanzas_gastos').select('*'),
            supabase.from('finanzas_gastos_fijos').select('*'),
            supabase.from('finanzas_compras_tdc').select('*'),
            supabase.from('finanzas_deudas').select('*'),
                          supabase.from('finanzas_retiros').select('*'),
              supabase.from('transacciones_finanzas').select('*'),
              supabase.from('clientes').select('id, negocio_nombre, contrato_valor, plan_pagos, historial_pagos'),
              supabase.from('auditoria_logs').select('*').order('created_at', { ascending: false }).limit(20)
            ]);
            
            if (audit && audit.data) setAuditLogs(audit.data);
          
          const mapIng = (r) => ({ id: r.id, concepto: r.concepto, cliente: r.cliente, tipo: r.tipo, monto: Number(r.monto), fecha: r.fecha });
          const mapGas = (r) => ({ id: r.id, concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), fecha: r.fecha, metodo: r.metodo });
          const mapFij = (r) => ({ id: r.id, concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), fechaInicio: r.fecha_inicio, diaCobro: r.dia_cobro });
          const mapTdc = (r) => ({ id: r.id, concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), fecha: r.fecha });
          const mapDeu = (r) => ({ id: r.id, concepto: r.concepto, monto: Number(r.monto), fechaLimite: r.fecha_limite });
          const mapRet = (r) => ({ id: r.id, socio: r.socio, monto: Number(r.monto), fecha: r.fecha });
          const mapTfIngreso = (r) => ({ id: r.id, cliente_id: r.cliente_id, concepto: r.descripcion || r.categoria, cliente: 'Directorio', tipo: 'Operativo', monto: Number(r.monto), fecha: r.fecha_pago || r.created_at });
          const mapTfGasto = (r) => ({ id: r.id, concepto: r.descripcion || r.categoria, categoria: r.categoria, monto: Number(r.monto), fecha: r.fecha_pago || r.created_at, metodo: 'Transferencia' });

          let fetchedIngresos = ing.data ? ing.data.map(mapIng) : [];
          let fetchedGastos = gas.data ? gas.data.map(mapGas) : [];

          if (tf.data) {
             const tfIngresos = tf.data.filter(t => t.tipo === 'ingreso').map(mapTfIngreso);
             const tfGastos = tf.data.filter(t => t.tipo === 'gasto').map(mapTfGasto);
             fetchedIngresos = [...fetchedIngresos, ...tfIngresos];
             fetchedGastos = [...fetchedGastos, ...tfGastos];
          }

          // --- SINCRONIZACIÓN AUTOMÁTICA DE CLIENTES ---
          if (cl.data) {
            cl.data.forEach(row => {
              // En Finanzas, cl.data es el arreglo crudo de la BD (sin mapToForm)
              const planPagos = row.plan_pagos || [];
              const cuotasPendientes = planPagos.filter(p => p.estado === 'Pendiente');
              const isPagado100 = planPagos.length > 0 && cuotasPendientes.length === 0;

              // Alternativa legacy por si el usuario lo ve como "Al día"
              const hoy = new Date();
              const mesActual = hoy.getMonth();
              const añoActual = hoy.getFullYear();
              const historialPagos = row.historial_pagos || [];
              const haPagadoEsteMes = historialPagos.some(p => {
                if(!p.fecha) return false;
                const [year, month] = p.fecha.split('-');
                return Number(month) - 1 === mesActual && Number(year) === añoActual;
              });

              // Si está 100% pagado (por cuotas) o si es pago de mes legacy, sumarlo virtualmente
              if ((isPagado100 || haPagadoEsteMes) && row.contrato_valor) {
                // Verificar si ya existe en fetchedIngresos
                const hasTx = fetchedIngresos.some(i => i.cliente_id === row.id || (i.concepto && i.concepto.includes(row.negocio_nombre)));
                
                if (!hasTx) {
                  // Agregar transacción virtual al estado para que sume
                  fetchedIngresos.push({
                    id: 'virtual_' + row.id,
                    cliente_id: row.id,
                    concepto: `Cobro mensual - ${row.negocio_nombre || 'Cliente'}`,
                    cliente: 'Directorio (Virtual)',
                    tipo: 'Operativo',
                    monto: Number(row.contrato_valor) || 0,
                    fecha: new Date().toISOString().split('T')[0]
                  });
                }
              }
            });
          }

          setIngresos(fetchedIngresos);
          setGastos(fetchedGastos);

          const fetchedGastosFijos = gf.data ? gf.data.map(item => ({
            id: item.id,
            concepto: item.concepto,
            categoria: item.categoria,
            monto: Number(item.monto),
            fechaInicio: item.fecha_inicio,
            diaCobro: item.dia_cobro
          })) : [];
          setGastosFijos(fetchedGastosFijos);



      } catch (err) {
        console.error('Error fetching finanzas', err);
      }
    };
    fetchData();
  }, []);


  // === ESTADOS (Modales) ===
  const [modalIngreso, setModalIngreso] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalFijo, setModalFijo] = useState(false);
  const [modalDeuda, setModalDeuda] = useState(false);
  const [modalRetiro, setModalRetiro] = useState(false);

  // === ESTADOS (Formularios) ===
  const [formIngreso, setFormIngreso] = useState({ concepto: '', cliente: '', tipo: 'Retainer', monto: '', fecha: '' });
  const [formGasto, setFormGasto] = useState({ concepto: '', categoria: 'Variables', monto: '', fecha: '', metodo: 'Caja General' });
  const [formFijo, setFormFijo] = useState({ concepto: '', categoria: 'SaaS', monto: '', fechaInicio: '', diaCobro: 1 });
  const [formDeuda, setFormDeuda] = useState({ concepto: '', monto: '', fechaLimite: '' });
  const [formRetiro, setFormRetiro] = useState({ socio: 'Davilson', monto: '' });

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
    fondoReinversionMes, fondoTotalBoveda, 
    saldoDavilson, saldoSantiago,
    totalTDC
  } = useMemo(() => {
    // Ingresos
    const tIngresos = ingresos.reduce((acc, curr) => acc + Number(curr.monto), 0);
    // Gastos que afectan caja (Efectivo/Transferencia + Recurrentes)
      const tGastosVar = gastos.filter(g => !['Bóveda de Agencia', 'Cuenta Davilson', 'Cuenta Santiago'].includes(g.metodo)).reduce((acc, curr) => acc + Number(curr.monto), 0);
      const tGastosFijos = gastosFijos.reduce((acc, curr) => acc + Number(curr.monto), 0);
      const tGastosCaja = tGastosVar + tGastosFijos; 
      
      // Gastos pagados con fondos específicos
      const gastosBoveda = gastos.filter(g => g.metodo === 'Bóveda de Agencia').reduce((acc, curr) => acc + Number(curr.monto), 0);
      const gastosDavilson = gastos.filter(g => g.metodo === 'Cuenta Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
      const gastosSantiago = gastos.filter(g => g.metodo === 'Cuenta Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);

      // Deuda TDC acumulada (No resta de la utilidad hasta que se pague)
      const tTDC = comprasTDC.reduce((acc, curr) => acc + Number(curr.monto), 0);
  
      // Utilidad Bruta (Ingresos reales - Gastos de caja reales)
      const uBruta = tIngresos - tGastosCaja;
      
      // Distribución
      // 15% intocable sobre los ingresos reales brutos? No, la instrucción dice "sobre los ingresos brutos reales ($3.500.000 * 0.15 = $525.000)"
      const fReinversion = tIngresos * 0.15; 
      
      // Utilidad Distribuible = Utilidad Bruta - 15% de Ingresos Brutos (que van a bóveda)
      const uDistribuible = uBruta > 0 ? (uBruta - fReinversion) : 0;
      const gananciaSocio = uDistribuible > 0 ? (uDistribuible * 0.50) : 0;
  
      // Retiros
      const retirosDavilson = retiros.filter(r => r.socio === 'Davilson').reduce((acc, curr) => acc + Number(curr.monto), 0);
      const retirosSantiago = retiros.filter(r => r.socio === 'Santiago').reduce((acc, curr) => acc + Number(curr.monto), 0);
  
      return {
        totalIngresos: tIngresos,
        totalGastosEfectivo: tGastosCaja,
        utilidadBrutaMes: uBruta,
        fondoReinversionMes: fReinversion,
        fondoTotalBoveda: fReinversion - gastosBoveda,
        saldoDavilson: gananciaSocio - retirosDavilson - gastosDavilson,
        saldoSantiago: gananciaSocio - retirosSantiago - gastosSantiago,
        totalTDC: tTDC
      };
  }, [ingresos, gastos, gastosFijos, comprasTDC, retiros]);

  // === MANEJADORES DE SUBMIT ===
  
  const handleIngreso = async (e) => {
    e.preventDefault();
    const payload = { concepto: formIngreso.concepto, cliente: formIngreso.cliente, tipo: formIngreso.tipo, monto: Number(formIngreso.monto), fecha: formIngreso.fecha };
    const { data } = await supabase.from('finanzas_ingresos').insert([payload]).select();
    if (data && data.length > 0) setIngresos([{ id: data[0].id, ...payload }, ...ingresos]);
    setModalIngreso(false);
  };

  const handleGasto = async (e) => {
    e.preventDefault();
    const payload = { concepto: formGasto.concepto, categoria: formGasto.categoria, monto: Number(formGasto.monto), fecha: formGasto.fecha };
    if (formGasto.metodo === 'Tarjeta de Crédito (TDC)' || formGasto.metodo === 'Tarjeta de Cr\u00e9dito') {
        const { data } = await supabase.from('finanzas_compras_tdc').insert([payload]).select();
        if (data && data.length > 0) setComprasTDC([{ id: data[0].id, ...payload }, ...comprasTDC]);
      } else {
        payload.metodo = formGasto.metodo;
        const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
        if (data && data.length > 0) { setGastos([{ id: data[0].id, ...payload }, ...gastos]); logAuditoria(user, 'Finanzas', 'CREAR', `Nuevo Gasto: ${payload.concepto} - ${payload.monto}`); }
      }
    setModalGasto(false);
  };

  const handleFijo = async (e) => {
    e.preventDefault();
    const payload = { concepto: formFijo.concepto, categoria: formFijo.categoria, monto: Number(formFijo.monto), fecha_inicio: formFijo.fechaInicio, dia_cobro: formFijo.diaCobro };
    const { data } = await supabase.from('finanzas_gastos_fijos').insert([payload]).select();
    if (data && data.length > 0) {
      setGastosFijos([...gastosFijos, { id: data[0].id, concepto: payload.concepto, categoria: payload.categoria, monto: payload.monto, fechaInicio: payload.fecha_inicio, diaCobro: payload.dia_cobro }]); logAuditoria(user, 'Finanzas', 'CREAR', `Nuevo Gasto Fijo: ${payload.concepto} - ${payload.monto}`);
    }
    setModalFijo(false);
  };

  const handleDeuda = async (e) => {
    e.preventDefault();
    const payload = { concepto: formDeuda.concepto, monto: Number(formDeuda.monto), fecha_limite: formDeuda.fechaLimite };
    const { data } = await supabase.from('finanzas_deudas').insert([payload]).select();
    if (data && data.length > 0) setDeudasPendientes([...deudasPendientes, { id: data[0].id, concepto: payload.concepto, monto: payload.monto, fechaLimite: payload.fecha_limite }]);
    setModalDeuda(false);
  };

  const handleRetiro = async (e) => {
    e.preventDefault();
    if (Number(formRetiro.monto) <= 0) return;
    const payload = { socio: formRetiro.socio, monto: Number(formRetiro.monto), fecha: new Date().toISOString().split('T')[0] };
    const { data } = await supabase.from('finanzas_retiros').insert([payload]).select();
    if (data && data.length > 0) setRetiros([...retiros, { id: data[0].id, socio: payload.socio, monto: payload.monto, fecha: payload.fecha }]);
    setModalRetiro(false);
  };


  // === ACCIONES ESPECIALES ===
  const pagarDeudaTercero = (deuda) => {
    // Al pagar, se vuelve un gasto efectivo real que sale de la caja
    setGastos([{ id: Date.now(), concepto: `Pago Deuda: ${deuda.concepto}`, categoria: 'Pago Pasivos', monto: deuda.monto, fecha: new Date().toISOString().split('T')[0] }, ...gastos]);
    // Y se elimina de pendientes
    setDeudasPendientes(deudasPendientes.filter(d => d.id !== deuda.id));
  };

  const pagarTarjetaCompleta = async () => {
    if (comprasTDC.length === 0) return;
    const tTDC = comprasTDC.reduce((acc, curr) => acc + Number(curr.monto), 0);
    const dateStr = new Date().toISOString().split('T')[0];
    const payload = { concepto: 'Pago Tarjeta de Crédito', categoria: 'Financiero', monto: tTDC, fecha: dateStr, metodo: 'Efectivo/Transferencia' };
    
    // Convert to expense
    const { data } = await supabase.from('finanzas_gastos').insert([payload]).select();
    if (data && data.length > 0) setGastos([{ id: data[0].id, ...payload }, ...gastos]);

    // Delete all TDC items
    for (const c of comprasTDC) {
      await supabase.from('finanzas_compras_tdc').delete().eq('id', c.id);
    }
    setComprasTDC([]);
  };

  // Funciones genéricas de borrado
  
  const deleteItem = async (tabla, setter, list, id) => {
    await supabase.from(tabla).delete().eq('id', id); logAuditoria(user, 'Finanzas', 'ELIMINAR', `Eliminado registro de ${tabla}`);
    setter(list.filter(item => item.id !== id));
  };


  // Formato Moneda
  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // === UI COMPONENTS ===
  const SocioCard = ({ nombre, saldo }) => {
    const isNegative = saldo < 0;
    return (
      <div className={`p-6 rounded-2xl border ${isNegative ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black'} flex flex-col justify-between shadow-sm`}>
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gloss-pink/30 flex items-center justify-center border border-gloss-pink text-gloss-burgundy font-bold">
                {nombre[0]}
              </div>
              <div>
                <h4 className="font-zodiak font-bold text-lg leading-tight">{nombre}</h4>
                <p className="text-xs text-gray-500">Cuenta Corriente</p>
              </div>
            </div>
            {isNegative ? (
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-semibold flex items-center gap-1">
                <ArrowDownCircle size={12} /> Deuda con la Agencia
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs font-semibold flex items-center gap-1">
                <ArrowUpCircle size={12} /> Saldo a favor
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Saldo Actual Disp.</p>
          <h3 className={`text-3xl font-bold font-zodiak ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCOP(saldo)}
          </h3>
        </div>
        <button onClick={() => { setFormRetiro({ socio: nombre, monto: '' }); setModalRetiro(true); }} className="mt-6 w-full py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <Wallet size={16} /> Registrar Retiro / Anticipo
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-zodiak font-bold text-gloss-burgundy dark:text-gloss-inverted">Dashboard Financiero</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Control maestro contable, flujos de caja y deudas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModalGasto(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium transition-colors text-sm">
            <TrendingDown size={16} /> Añadir Gasto
          </button>
          <button onClick={() => setModalIngreso(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gloss-burgundy hover:bg-gloss-burgundy/90 text-white font-medium transition-colors shadow-sm text-sm">
            <Plus size={16} /> Añadir Ingreso
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: BÓVEDA & SOCIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-gloss-burgundy bg-gloss-burgundy text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10"><Landmark size={180} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 rounded-xl"><PiggyBank size={24} /></div>
              <div>
                <h3 className="font-zodiak font-bold text-xl">Bóveda de Agencia</h3>
                <p className="text-sm text-white/80">Fondo Reinversión Acumulado</p>
              </div>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-1">Total Protegido</p>
              <h2 className="text-4xl font-bold font-zodiak">{formatCOP(fondoTotalBoveda)}</h2>
              </div>
            </div>
            
            <div className="mt-4 relative z-10">
              <button 
                onClick={() => {
                  setFormGasto({ concepto: '', categoria: 'Operativos', monto: '', fecha: new Date().toISOString().split('T')[0], metodo: 'Bóveda de Agencia' });
                  setModalGasto(true);
                }}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Registrar Retiro / Gasto de Reinversión
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/20 relative z-10 flex justify-between items-center text-sm">
              <span>+{formatCOP(fondoReinversionMes)} (Mes actual)</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">15% Intocable</span>
            </div>
          </div>
        <SocioCard nombre="Davilson" saldo={saldoDavilson} />
        <SocioCard nombre="Santiago" saldo={saldoSantiago} />
      </div>

      {/* SECCIÓN 2: RENDIMIENTO MES ACTUAL */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black shadow-sm">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> Ingresos Brutos (Caja)</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCOP(totalIngresos)}</h3>
          </div>
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gloss-black shadow-sm">
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><TrendingDown size={16} className="text-red-500" /> Gastos Ejecutados (Caja)</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCOP(totalGastosEfectivo)}</h3>
          </div>
          <div className={`p-5 rounded-xl border ${utilidadBrutaMes >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'} shadow-sm`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Utilidad Neta Disponible</p>
            <h3 className={`text-2xl font-bold ${utilidadBrutaMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(utilidadBrutaMes)}</h3>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: CONTROL DE DEUDAS (TDC & Terceros) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tarjetas de Crédito */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
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
            <button onClick={pagarTarjetaCompleta} disabled={comprasTDC.length === 0} className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${comprasTDC.length > 0 ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              Pagar Tarjeta
            </button>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {comprasTDC.length === 0 && <tr><td className="p-6 text-center text-gray-500">No hay deudas en TDC</td></tr>}
                {comprasTDC.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3"><p className="font-medium">{c.concepto}</p><span className="text-xs text-gray-500">{c.fecha}</span></td>
                    <td className="p-3 font-medium text-red-500 text-right">-{formatCOP(c.monto)}</td>
                    <td className="p-3 text-center"><button onClick={() => deleteItem('finanzas_compras_tdc', setComprasTDC, comprasTDC, c.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuentas por Pagar (Terceros) */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-orange-50/50 dark:bg-orange-900/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="text-orange-500" size={20} />
              <h3 className="font-zodiak font-bold text-lg text-orange-600 dark:text-orange-400">Cuentas por Pagar</h3>
            </div>
            <button onClick={() => setModalDeuda(true)} className="text-sm px-3 py-1.5 rounded-lg font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 transition-colors flex items-center gap-1">
              <Plus size={14} /> Registrar
            </button>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deudasPendientes.length === 0 && <tr><td className="p-6 text-center text-gray-500">Sin deudas a terceros</td></tr>}
                {deudasPendientes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3">
                      <p className="font-medium">{d.concepto}</p>
                      <span className="text-xs text-orange-500 font-medium">Vence: {d.fechaLimite}</span>
                    </td>
                    <td className="p-3 font-medium text-orange-500 text-right">{formatCOP(d.monto)}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => pagarDeudaTercero(d)} title="Liquidar/Pagar" className="text-gray-400 hover:text-green-500"><CheckCircle size={18} /></button>
                        <button onClick={() => deleteItem('finanzas_deudas', setDeudasPendientes, deudasPendientes, d.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: TABLAS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* INGRESOS */}
        <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
            <TrendingUp className="text-green-500" size={18} /> <h3 className="font-zodiak font-bold text-lg">Historial de Ingresos</h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 sticky top-0">
                <tr>
                  <th className="p-3 font-medium">Detalle</th>
                  <th className="p-3 font-medium">Fecha</th>
                  <th className="p-3 font-medium text-right">Monto</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {ingresos.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3">
                      <p className="font-medium">{i.concepto}</p>
                      <p className="text-xs text-gray-500">{i.cliente} • {i.tipo}</p>
                    </td>
                    <td className="p-3 text-gray-500">{i.fecha}</td>
                    <td className="p-3 font-medium text-green-600 text-right">{formatCOP(i.monto)}</td>
                    <td className="p-3 text-center"><button onClick={() => deleteItem('finanzas_ingresos', setIngresos, ingresos, i.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GASTOS Y RECURRENTES (Agrupados Visualmente) */}
        <div className="space-y-6">
          {/* Fijos / Recurrentes */}
          <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h3 className="font-zodiak font-bold text-lg flex items-center gap-2"><RefreshCw className="text-blue-500" size={18} /> Gastos Fijos (Automáticos)</h3>
              <button onClick={() => setModalFijo(true)} className="text-xs font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1"><Plus size={14}/> Añadir</button>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {gastosFijos.map(f => {
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle size={12}/> En {days} {days===1?'día':'días'}</span>
                          ) : (
                            <span className="text-xs text-gray-500">Día {f.diaCobro}</span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-gray-900 dark:text-white text-right">-{formatCOP(f.monto)}</td>
                        <td className="p-3 text-center"><button onClick={() => deleteItem('finanzas_gastos_fijos', setGastosFijos, gastosFijos, f.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Gastos Variables Efectivo */}
          <div className="bg-white dark:bg-gloss-black rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
              <TrendingDown className="text-gray-500" size={18} /> <h3 className="font-zodiak font-bold text-lg">Gastos Variables (Pagados)</h3>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {gastos.length===0 && <tr><td className="p-4 text-center text-gray-500">Sin gastos registrados</td></tr>}
                  {gastos.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="p-3"><p className="font-medium">{g.concepto}</p><span className="text-xs text-gray-500">{g.categoria}</span></td>
                      <td className="p-3 text-gray-500">{g.fecha}</td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white text-right">-{formatCOP(g.monto)}</td>
                      <td className="p-3 text-center"><button onClick={() => deleteItem('finanzas_gastos', setGastos, gastos, g.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODALES ================= */}
      
      {/* Modal Ingreso */}
      {modalIngreso && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4">Añadir Ingreso</h3>
            <form onSubmit={handleIngreso} className="space-y-4">
              <div><label className="block text-sm mb-1">Concepto</label><input required value={formIngreso.concepto} onChange={e=>setFormIngreso({...formIngreso, concepto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="Ej: Abono diseño web"/></div>
              <div><label className="block text-sm mb-1">Cliente Asociado</label><input required value={formIngreso.cliente} onChange={e=>setFormIngreso({...formIngreso, cliente: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="Ej: TechCorp S.A."/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Tipo</label><select value={formIngreso.tipo} onChange={e=>setFormIngreso({...formIngreso, tipo: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent dark:bg-gray-900"><option>Retainer</option><option>Pagos Únicos</option><option>Abono</option></select></div>
                <div><label className="block text-sm mb-1">Fecha</label><input required type="date" value={formIngreso.fecha} onChange={e=>setFormIngreso({...formIngreso, fecha: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              </div>
              <div><label className="block text-sm mb-1">Monto (COP)</label><input required type="number" min="0" value={formIngreso.monto} onChange={e=>setFormIngreso({...formIngreso, monto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalIngreso(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-gloss-burgundy text-white font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gasto (Variable / TDC) */}
      {modalGasto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4">Añadir Gasto</h3>
            <form onSubmit={handleGasto} className="space-y-4">
              <div><label className="block text-sm mb-1">Concepto</label><input required value={formGasto.concepto} onChange={e=>setFormGasto({...formGasto, concepto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="Ej: Pauta Meta Ads"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Categoría</label><select value={formGasto.categoria} onChange={e=>setFormGasto({...formGasto, categoria: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent dark:bg-gray-900"><option>Variables</option><option>Operativos</option><option>Equipos</option></select></div>
                <div><label className="block text-sm mb-1">Fecha</label><input required type="date" value={formGasto.fecha} onChange={e=>setFormGasto({...formGasto, fecha: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              </div>
              <div><label className="block text-sm mb-1">Origen del Dinero</label><select value={formGasto.metodo} onChange={e=>setFormGasto({...formGasto, metodo: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent dark:bg-gray-900 font-medium text-gloss-burgundy"><option>Caja General</option><option>Bóveda de Agencia</option><option>Cuenta Davilson</option><option>Cuenta Santiago</option><option>Tarjeta de Crédito (TDC)</option></select></div>
              <div><label className="block text-sm mb-1">Monto (COP)</label><input required type="number" min="0" value={formGasto.monto} onChange={e=>setFormGasto({...formGasto, monto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalGasto(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-gloss-burgundy text-white font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fijo */}
      {modalFijo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4">Añadir Gasto Recurrente</h3>
            <form onSubmit={handleFijo} className="space-y-4">
              <div><label className="block text-sm mb-1">SaaS / Concepto</label><input required value={formFijo.concepto} onChange={e=>setFormFijo({...formFijo, concepto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Día de Cobro (1-31)</label><input required type="number" min="1" max="31" value={formFijo.diaCobro} onChange={e=>setFormFijo({...formFijo, diaCobro: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
                <div><label className="block text-sm mb-1">Fecha Inicio</label><input required type="date" value={formFijo.fechaInicio} onChange={e=>setFormFijo({...formFijo, fechaInicio: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              </div>
              <div><label className="block text-sm mb-1">Categoría</label><select value={formFijo.categoria} onChange={e=>setFormFijo({...formFijo, categoria: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent dark:bg-gray-900"><option>SaaS</option><option>Nómina</option><option>Servicios</option></select></div>
              <div><label className="block text-sm mb-1">Monto (COP)</label><input required type="number" min="0" value={formFijo.monto} onChange={e=>setFormFijo({...formFijo, monto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent" placeholder="0"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalFijo(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-gloss-burgundy text-white font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deuda Terceros */}
      {modalDeuda && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-4 text-orange-600">Registrar Deuda a Tercero</h3>
            <form onSubmit={handleDeuda} className="space-y-4">
              <div><label className="block text-sm mb-1">Concepto / Acreedor</label><input required value={formDeuda.concepto} onChange={e=>setFormDeuda({...formDeuda, concepto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              <div><label className="block text-sm mb-1">Fecha Límite Pago</label><input required type="date" value={formDeuda.fechaLimite} onChange={e=>setFormDeuda({...formDeuda, fechaLimite: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              <div><label className="block text-sm mb-1">Monto Adeudado (COP)</label><input required type="number" min="0" value={formDeuda.monto} onChange={e=>setFormDeuda({...formDeuda, monto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalDeuda(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-orange-600 text-white font-medium">Guardar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Retiro */}
      {modalRetiro && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gloss-black rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-zodiak font-bold mb-1">Retiro de Capital</h3>
            <p className="text-sm text-gray-500 mb-4">Socio: <strong className="text-gray-900 dark:text-white">{formRetiro.socio}</strong></p>
            <form onSubmit={handleRetiro} className="space-y-4">
              <div><label className="block text-sm mb-1">Monto a retirar (COP)</label><input required type="number" min="1" value={formRetiro.monto} onChange={e=>setFormRetiro({...formRetiro, monto: e.target.value})} className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-transparent text-lg"/></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModalRetiro(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium">Confirmar Retiro</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
