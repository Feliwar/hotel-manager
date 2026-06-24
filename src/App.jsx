import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const TIPOS = [
  'Individual', 'Doble', 'Matrimonial', 'Triple', 'Matrimonial+1',
  'Individual Superior', 'Doble Superior', 'Triple Superior', 'Matrimonial Superior', 'Cuádruple',
]

function loadSettings() {
  try {
    return {
      precioDesayuno: parseFloat(localStorage.getItem('hm_desayuno') || '0') || 0,
      preciosHab: JSON.parse(localStorage.getItem('hm_precios') || 'null') ||
        Object.fromEntries(TIPOS.map(t => [t, 0])),
      tiposPorNumero: JSON.parse(localStorage.getItem('hm_tipos_numero') || 'null') ||
        Object.fromEntries(TIPOS.map(t => [t, ''])),
    }
  } catch {
    return {
      precioDesayuno: 0,
      preciosHab: Object.fromEntries(TIPOS.map(t => [t, 0])),
      tiposPorNumero: Object.fromEntries(TIPOS.map(t => [t, ''])),
    }
  }
}

function parseNumerosList(str) {
  return new Set((str || '').split(',').map(s => s.trim()).filter(Boolean))
}

function tipoDesdeNumero(numero, tiposPorNumero) {
  for (const tipo of TIPOS) {
    if (parseNumerosList(tiposPorNumero[tipo]).has(String(numero))) return tipo
  }
  return null
}

function fmtFecha(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

function calcNochesFechas(inicio, fin) {
  if (!inicio || !fin) return 0
  const a = new Date(inicio)
  const b = new Date(fin)
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function nowSantiago() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function diasDesayuno(fechaInicio, fechaFin, contarDiaIngreso) {
  if (!fechaInicio || !fechaFin) return []
  const dias = []
  let cursor = contarDiaIngreso ? fechaInicio : sumarDias(fechaInicio, 1)
  while (cursor <= fechaFin) { dias.push(cursor); cursor = sumarDias(cursor, 1) }
  return dias
}

// ── CÁLCULO CENTRAL DE MONTOS ────────────────────────────────────────────────
// empresa_id presente + tarifa_empresa_hab > 0 → precio = personas × tarifa_empresa_hab × noches
// tarifa_empresa_hab es la tarifa definida EN LA HABITACIÓN al asignarla a empresa
function calcMontos(form, precioDesayuno) {
  const noches = calcNochesFechas(form.fecha_inicio, form.fecha_fin)
  const personas = form.personas_empresa || 0
  const tarifaHab = form.tarifa_empresa_hab || 0 // tarifa/persona definida en esta habitación

  const precioHab = form.empresa_id && personas > 0 && tarifaHab > 0
    ? personas * tarifaHab * Math.max(noches, 1)
    : (form.precio_base || 0) * Math.max(noches, 1)

  const desayunosBase = form.desayunos || 0
  const overrides = form.desayunos_overrides || {}
  const dias = diasDesayuno(form.fecha_inicio, form.fecha_fin, form.contar_dia_ingreso)
  const detalleDesayunos = dias.map(dia => ({
    dia, cantidad: overrides[dia] !== undefined ? overrides[dia] : desayunosBase,
  }))
  const totalUnidadesDesayuno = detalleDesayunos.reduce((s, d) => s + d.cantidad, 0)
  const desayunosBruto = totalUnidadesDesayuno * precioDesayuno
  const desayunosAplicado = form.no_cobrar_desayuno ? 0 : desayunosBruto

  const subtotal = precioHab + desayunosAplicado
  const ivaBase = subtotal * 0.19
  const ivaAplicado = form.no_cobrar_iva ? 0 : ivaBase
  const total = Math.round(subtotal + ivaAplicado)

  const abono = form.abono || 0
  const montoPagado = form.monto_pagado || 0
  const saldoTrasAbono = total - abono
  const diferenciaPagadoReservado = subtotal - montoPagado

  return {
    noches, precioHab, desayunosBase, dias, detalleDesayunos,
    totalUnidadesDesayuno, desayunosBruto, desayunosAplicado,
    subtotal, ivaBase, ivaAplicado, total,
    abono, montoPagado, saldoTrasAbono, diferenciaPagadoReservado,
    personas, tarifaHab,
  }
}

// ── Íconos ───────────────────────────────────────────────────────────────────
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33
        1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06
        a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
        A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9
        4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06
        a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
        a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function CheckIcon({ className }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function ChevronIcon({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-150 shrink-0 ${open ? 'rotate-180' : ''}`}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

// ── MODAL CONFIGURACIÓN ──────────────────────────────────────────────────────
function SettingsModal({ onClose, onSaved, empresas, onEmpresasChange }) {
  const saved = loadSettings()
  const [precioDesayuno, setPrecioDesayuno] = useState(saved.precioDesayuno)
  const [preciosHab, setPreciosHab] = useState(saved.preciosHab)
  const [tiposPorNumero, setTiposPorNumero] = useState(saved.tiposPorNumero)

  const [empList, setEmpList] = useState(empresas)
  const [nuevaEmpNombre, setNuevaEmpNombre] = useState('')
  const [guardandoEmp, setGuardandoEmp] = useState(false)

  const agregarEmpresa = async () => {
    const nombre = nuevaEmpNombre.trim()
    if (!nombre) return
    if (empList.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) return
    setGuardandoEmp(true)
    const { data, error } = await supabase
      .from('empresas').insert({ nombre }).select().single()
    setGuardandoEmp(false)
    if (error) { alert('Error al guardar empresa: ' + error.message); return }
    const newList = [...empList, data]
    setEmpList(newList)
    onEmpresasChange(newList)
    setNuevaEmpNombre('')
  }

  const eliminarEmpresa = async (id) => {
    if (!confirm('¿Eliminar esta empresa? Las habitaciones asignadas quedarán sin empresa.')) return
    const { error } = await supabase.from('empresas').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    const newList = empList.filter(e => e.id !== id)
    setEmpList(newList)
    onEmpresasChange(newList)
  }

  const guardar = () => {
    localStorage.setItem('hm_desayuno', String(precioDesayuno))
    localStorage.setItem('hm_precios', JSON.stringify(preciosHab))
    localStorage.setItem('hm_tipos_numero', JSON.stringify(tiposPorNumero))
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#224258]">Configuración</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Precio por desayuno</p>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden mb-5">
          <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
          <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
            value={precioDesayuno || ''} placeholder="0"
            onChange={e => setPrecioDesayuno(parseFloat(e.target.value) || 0)} />
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Precio base por tipo</p>
        <div className="space-y-2 mb-6">
          {TIPOS.map(tipo => (
            <div key={tipo} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-32 shrink-0">{tipo}</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1">
                <span className="px-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5">$</span>
                <input type="number" className="flex-1 px-2 py-1.5 text-sm text-gray-900 focus:outline-none"
                  value={preciosHab[tipo] || ''} placeholder="0"
                  onChange={e => setPreciosHab(p => ({ ...p, [tipo]: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Habitaciones por tipo</p>
        <p className="text-xs text-gray-400 mb-3">Números separados por coma. Ej: 1,7,8,9</p>
        <div className="space-y-2 mb-6">
          {TIPOS.map(tipo => (
            <div key={tipo} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-32 shrink-0">{tipo}</span>
              <input type="text"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                value={tiposPorNumero[tipo] || ''} placeholder="1,7,8,9"
                onChange={e => setTiposPorNumero(p => ({ ...p, [tipo]: e.target.value }))} />
            </div>
          ))}
        </div>

        {/* ── PERFIL EMPRESA ── */}
        <div className="border-t border-gray-100 pt-5 mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Perfil Empresa</p>
          <p className="text-xs text-gray-400 mb-3">La tarifa por persona se define en cada habitación al asignarle empresa.</p>
          <div className="space-y-2 mb-3">
            {empList.map(emp => (
              <div key={emp.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-medium text-[#224258] truncate">{emp.nombre}</span>
                <button onClick={() => eliminarEmpresa(emp.id)}
                  className="text-gray-300 hover:text-red-400 transition text-lg leading-none shrink-0">×</button>
              </div>
            ))}
            {empList.length === 0 && (
              <p className="text-xs text-gray-300 italic">Sin empresas registradas.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text"
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              placeholder="Nombre empresa"
              value={nuevaEmpNombre}
              onChange={e => setNuevaEmpNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarEmpresa()} />
            <button onClick={agregarEmpresa} disabled={guardandoEmp}
              className="bg-[#224258] text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[#1a3447] transition disabled:opacity-50">
              {guardandoEmp ? '…' : 'Agregar'}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={guardar}
            className="flex-1 bg-[#224258] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1a3447] transition">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MODAL HABITACIÓN ─────────────────────────────────────────────────────────
function RoomModal({ hab, onClose, onSave, empresas }) {
  const settings = loadSettings()
  const precioBase = settings.preciosHab[hab.tipo] || hab.precio_base || 0
  const precioDesayuno = settings.precioDesayuno

  const [form, setForm] = useState({
    no_cobrar_desayuno: false,
    no_cobrar_iva: false,
    estado_pago: 'no_abonado',
    abono: 0,
    monto_pagado: 0,
    desayunos: 0,
    contar_dia_ingreso: false,
    desayunos_overrides: {},
    empresa_id: null,
    personas_empresa: 0,
    tarifa_empresa_hab: 0,
    ...hab,
    precio_base: precioBase,
  })

  const [fechaFase, setFechaFase] = useState('inicio')
  const [ajustarPorDia, setAjustarPorDia] = useState(false)

  const esReservado = form.estado === 'reservado'
  const esOcupado = form.estado === 'ocupado'
  const esConfirmarSalida = form.estado === 'confirmar_salida'
  const mostrarFormulario = esReservado || esOcupado || esConfirmarSalida

  const m = calcMontos(form, precioDesayuno)
  const tieneEmpresa = !!form.empresa_id

  const set = (field, value) => {
    setForm(prev => {
      const u = { ...prev, [field]: value }
      if (field === 'estado' && value === 'libre') { u.fecha_inicio = null; u.fecha_fin = null }
      if (field === 'estado_pago') {
        if (['no_abonado', 'no_pagado', 'pago_total'].includes(value)) { u.abono = 0; u.monto_pagado = 0 }
        if (value === 'abonado') u.monto_pagado = 0
        if (value === 'pagado') u.abono = 0
        if (value === 'pago_parcial') u.abono = 0
      }
      if (field === 'empresa_id' && !value) { u.personas_empresa = 0; u.tarifa_empresa_hab = 0 }
      return u
    })
  }

  const ajustarDesayunoDia = (dia, delta) => {
    setForm(prev => {
      const base = prev.desayunos || 0
      const overrides = { ...(prev.desayunos_overrides || {}) }
      const actual = overrides[dia] !== undefined ? overrides[dia] : base
      const nuevo = Math.max(0, actual + delta)
      if (nuevo === base) delete overrides[dia]
      else overrides[dia] = nuevo
      return { ...prev, desayunos_overrides: overrides }
    })
  }

  const llegoReserva = () => {
    const abonoPrevio = form.abono || 0
    const nuevoForm = {
      ...form,
      estado: 'ocupado',
      estado_pago: abonoPrevio > 0 ? 'pago_parcial' : 'no_pagado',
      monto_pagado: abonoPrevio,
      abono: 0,
    }
    setForm(nuevoForm)
    onSave(nuevoForm)
  }

  const labelPago = {
    no_abonado: 'No abonado', abonado: 'Abonado', pagado: 'Pagado',
    no_pagado: 'No pagado', pago_parcial: 'Pago parcial', pago_total: 'Pago total',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[92vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Habitación</p>
            <h2 className="text-xl font-semibold text-[#224258]">{hab.numero}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Estado */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
              value={form.estado} onChange={e => set('estado', e.target.value)}>
              <option value="libre">Libre</option>
              <option value="reservado">Reservado</option>
              <option value="ocupado">Ocupado</option>
              <option value="confirmar_salida">Confirmar salida</option>
            </select>
          </div>

          {/* Acciones contextuales */}
          {esReservado && (
            <button onClick={llegoReserva}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: '#DDC395', color: '#224258' }}>
              Llegó la reserva
            </button>
          )}
          {(esOcupado || esConfirmarSalida) && (
            <button onClick={() => onSave({ ...form, _confirmar_salida: true })}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: '#7C3AED', color: '#fff' }}>
              Confirmar salida
            </button>
          )}

          {/* ── EMPRESA ── */}
          {mostrarFormulario && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox"
                  checked={tieneEmpresa}
                  onChange={e => {
                    if (!e.target.checked) {
                      set('empresa_id', null)
                    } else if (empresas.length > 0) {
                      set('empresa_id', empresas[0].id)
                    } else {
                      alert('Primero agrega una empresa en Configuración.')
                    }
                  }}
                  className="w-4 h-4 accent-[#224258]" />
                <span className="text-sm font-semibold text-[#224258]">Empresa</span>
              </label>

              {tieneEmpresa && empresas.length > 0 && (
                <>
                  {/* Selector de empresa */}
                  <select
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none"
                    value={form.empresa_id || ''}
                    onChange={e => set('empresa_id', e.target.value || null)}>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>

                  {/* Tarifa por persona — se define aquí, en esta habitación */}
                  <div>
                    <label className="block mb-1 text-xs text-blue-600 font-medium">Tarifa por persona (esta habitación)</label>
                    <div className="flex items-center border border-blue-200 rounded-lg overflow-hidden bg-white">
                      <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-blue-100 py-2">$</span>
                      <input type="number"
                        className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                        placeholder="0"
                        value={form.tarifa_empresa_hab || ''}
                        onChange={e => set('tarifa_empresa_hab', parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  {/* Cantidad de personas */}
                  <div>
                    <label className="block mb-1.5 text-xs text-blue-600 font-medium">Personas en esta habitación</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => set('personas_empresa', Math.max(0, (form.personas_empresa || 0) - 1))}
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 text-lg font-medium flex items-center justify-center transition">−</button>
                      <span className="w-8 text-center text-base font-semibold text-gray-800">{form.personas_empresa || 0}</span>
                      <button
                        onClick={() => set('personas_empresa', (form.personas_empresa || 0) + 1)}
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 text-lg font-medium flex items-center justify-center transition">+</button>
                      {(form.personas_empresa || 0) > 0 && (form.tarifa_empresa_hab || 0) > 0 && (
                        <span className="text-xs text-blue-500 ml-1">
                          ${((form.personas_empresa || 0) * (form.tarifa_empresa_hab || 0)).toLocaleString('es-CL')}/noche
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {tieneEmpresa && empresas.length === 0 && (
                <p className="text-xs text-gray-400">Sin empresas. Agrega una en Configuración.</p>
              )}
            </div>
          )}

          {/* Fechas */}
          {mostrarFormulario && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex gap-1 mb-1">
                {['inicio', 'fin'].map(fase => (
                  <button key={fase} onClick={() => setFechaFase(fase)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                      fechaFase === fase
                        ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                        : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                    {fase === 'inicio' ? 'Entrada' : 'Salida'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 text-xs">
                <div className="flex-1">
                  <p className="text-gray-400 mb-0.5">Entrada</p>
                  <p className={`font-semibold ${fechaFase === 'inicio' ? 'text-gray-900' : 'text-gray-500'}`}>
                    {fmtFecha(form.fecha_inicio) || '—'}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 mb-0.5">Salida</p>
                  <p className={`font-semibold ${fechaFase === 'fin' ? 'text-gray-900' : 'text-gray-500'}`}>
                    {fmtFecha(form.fecha_fin) || '—'}
                  </p>
                </div>
                {m.noches > 0 && (
                  <div className="text-right">
                    <p className="text-gray-400 mb-0.5">Noches</p>
                    <p className="font-semibold text-gray-700">{m.noches}</p>
                  </div>
                )}
              </div>
              <input key={fechaFase} type="date" autoFocus
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none"
                value={fechaFase === 'inicio' ? (form.fecha_inicio || '') : (form.fecha_fin || '')}
                min={fechaFase === 'fin' ? (form.fecha_inicio || undefined) : undefined}
                onChange={e => {
                  const val = e.target.value
                  if (fechaFase === 'inicio') { set('fecha_inicio', val); setFechaFase('fin') }
                  else set('fecha_fin', val)
                }} />
            </div>
          )}

          {/* Desayunos */}
          {mostrarFormulario && (
            <div className="space-y-2">
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Desayunos por día</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none"
                value={form.desayunos || 0} onChange={e => set('desayunos', parseInt(e.target.value))}>
                <option value={0}>Ninguno</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              {(form.desayunos || 0) > 0 && precioDesayuno > 0 && (
                <p className="text-xs text-gray-400">Precio c/u: ${precioDesayuno.toLocaleString('es-CL')} · definido en Configuración</p>
              )}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input type="checkbox" checked={!!form.contar_dia_ingreso}
                  onChange={e => set('contar_dia_ingreso', e.target.checked)}
                  className="w-4 h-4 accent-[#224258]" />
                <span className="text-sm text-gray-600">Contar día de ingreso</span>
              </label>
              {(form.desayunos || 0) > 0 && m.dias.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={ajustarPorDia}
                    onChange={e => setAjustarPorDia(e.target.checked)}
                    className="w-4 h-4 accent-[#224258]" />
                  <span className="text-sm text-gray-600">Ajustar desayunos por día</span>
                </label>
              )}
              {ajustarPorDia && (form.desayunos || 0) > 0 && m.detalleDesayunos.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-gray-400">Ajustar por día</p>
                  {m.detalleDesayunos.map(({ dia, cantidad }) => (
                    <div key={dia} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm text-gray-600">{fmtFecha(dia)}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => ajustarDesayunoDia(dia, -1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-base font-medium flex items-center justify-center transition">−</button>
                        <span className="w-5 text-center text-sm font-semibold text-gray-800">{cantidad}</span>
                        <button onClick={() => ajustarDesayunoDia(dia, 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-base font-medium flex items-center justify-center transition">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Exenciones */}
          {mostrarFormulario && (
            <div className="flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={!!form.no_cobrar_desayuno}
                  onChange={e => set('no_cobrar_desayuno', e.target.checked)}
                  className="w-4 h-4 accent-[#224258]" />
                <span className="text-sm text-gray-600">No cobrar desayuno</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={!!form.no_cobrar_iva}
                  onChange={e => set('no_cobrar_iva', e.target.checked)}
                  className="w-4 h-4 accent-[#224258]" />
                <span className="text-sm text-gray-600">No cobrar IVA</span>
              </label>
            </div>
          )}

          {/* Estado de pago — Reservado */}
          {esReservado && (
            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado del pago</label>
              <div className="flex gap-2">
                {['no_abonado', 'abonado', 'pagado'].map(ep => (
                  <button key={ep} onClick={() => set('estado_pago', ep)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                      form.estado_pago === ep
                        ? ep === 'no_abonado' ? 'bg-gray-100 border-gray-300 text-gray-700'
                          : ep === 'abonado' ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                    {labelPago[ep]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estado de pago — Ocupado / Confirmar salida */}
          {(esOcupado || esConfirmarSalida) && (
            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado del pago</label>
              <div className="flex gap-2">
                {['no_pagado', 'pago_parcial', 'pago_total'].map(ep => (
                  <button key={ep} onClick={() => set('estado_pago', ep)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                      form.estado_pago === ep
                        ? ep === 'no_pagado' ? 'bg-gray-100 border-gray-300 text-gray-700'
                          : ep === 'pago_parcial' ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : ep === 'pago_parcial' ? 'border-gray-200 text-gray-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                    {labelPago[ep]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Montos de pago */}
          {esReservado && form.estado_pago === 'abonado' && (
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Monto abonado</label>
              <p className="text-xs text-gray-400 mb-1.5">Se aplica al valor bruto (sin IVA)</p>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
                <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  value={form.abono || ''} placeholder="0"
                  onChange={e => set('abono', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}
          {esReservado && form.estado_pago === 'pagado' && (
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Monto pagado</label>
              <p className="text-xs text-gray-400 mb-1.5">Se compara contra subtotal bruto (sin IVA)</p>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
                <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  value={form.monto_pagado || ''} placeholder="0"
                  onChange={e => set('monto_pagado', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}
          {(esOcupado || esConfirmarSalida) && form.estado_pago === 'pago_parcial' && (
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Monto pagado</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
                <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  value={form.monto_pagado || ''} placeholder="0"
                  onChange={e => set('monto_pagado', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {/* Desglose */}
          {mostrarFormulario && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
              {tieneEmpresa && m.personas > 0 && m.tarifaHab > 0 ? (
                <div className="flex justify-between text-blue-600">
                  <span>{m.personas} pers. × ${m.tarifaHab.toLocaleString('es-CL')} × {Math.max(m.noches,1)} noches</span>
                  <span>${m.precioHab.toLocaleString('es-CL')}</span>
                </div>
              ) : (
                <div className="flex justify-between text-gray-500">
                  <span>Habitación{m.noches > 1 ? ` ×${m.noches} noches` : ''}</span>
                  <span>${m.precioHab.toLocaleString('es-CL')}</span>
                </div>
              )}
              {m.totalUnidadesDesayuno > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Desayunos ×{m.totalUnidadesDesayuno}{form.no_cobrar_desayuno ? ' — exento' : ''}</span>
                  <span className={form.no_cobrar_desayuno ? 'line-through text-gray-300' : ''}>
                    ${m.desayunosBruto.toLocaleString('es-CL')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 font-medium border-t border-gray-200 pt-2">
                <span>Subtotal bruto</span><span>${m.subtotal.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA 19%{form.no_cobrar_iva ? ' — exento' : ''}</span>
                <span className={form.no_cobrar_iva ? 'line-through text-gray-300' : ''}>
                  ${Math.round(m.ivaBase).toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-[#224258] border-t border-gray-200 pt-2">
                <span>Total</span><span>${m.total.toLocaleString('es-CL')}</span>
              </div>
              {esReservado && form.estado_pago === 'abonado' && m.abono > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Abono</span><span>−${m.abono.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between font-medium text-amber-600">
                    <span>Saldo pendiente</span>
                    <span>${Math.max(0, m.saldoTrasAbono).toLocaleString('es-CL')}</span>
                  </div>
                </>
              )}
              {esReservado && form.estado_pago === 'pagado' && m.montoPagado > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Monto pagado (bruto)</span><span>${m.montoPagado.toLocaleString('es-CL')}</span>
                  </div>
                  {m.diferenciaPagadoReservado !== 0 ? (
                    <div className="flex justify-between font-medium text-amber-600">
                      <span>Diferencia</span><span>${Math.abs(m.diferenciaPagadoReservado).toLocaleString('es-CL')}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-medium text-emerald-600">
                      <span>Sin diferencia</span><span>$0</span>
                    </div>
                  )}
                </>
              )}
              {(esOcupado || esConfirmarSalida) && form.estado_pago === 'pago_parcial' && m.montoPagado > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Pagado</span><span>−${m.montoPagado.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between font-medium text-amber-600">
                    <span>Saldo pendiente</span>
                    <span>${Math.max(0, m.total - m.montoPagado).toLocaleString('es-CL')}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 pb-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => onSave(form)}
              className="flex-1 bg-[#224258] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1a3447] transition">
              Guardar
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── PANEL SIGUIENTE ──────────────────────────────────────────────────────────
function SiguientePanel({ habitaciones, onSelectHab, empresas, cobrosEmpresa, onToggleCobro }) {
  const nowSCL = nowSantiago()
  const hoy = nowSCL.toISOString().split('T')[0]
  const ddMM = `${String(nowSCL.getDate()).padStart(2, '0')}/${String(nowSCL.getMonth() + 1).padStart(2, '0')}`
  const settings = loadSettings()
  const precioDesayuno = settings.precioDesayuno

  // Fecha de navegación para el panel de empresa
  const [fechaEmp, setFechaEmp] = useState(hoy)
  // Días seleccionados para agrupación (Set de strings ISO)
  const [diasSeleccionados, setDiasSeleccionados] = useState(new Set())
  const [expandedEmpresas, setExpandedEmpresas] = useState({})

  const reservas = habitaciones
    .filter(h => h.estado === 'reservado')
    .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))

  const checkouts = habitaciones
    .filter(h => h.estado === 'confirmar_salida' || (h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy))
    .sort((a, b) => (a.fecha_fin || '').localeCompare(b.fecha_fin || ''))

  const todasSalidas = habitaciones
    .filter(h => h.fecha_fin && h.estado !== 'libre' && h.estado !== 'confirmar_salida')
    .sort((a, b) => (a.fecha_fin || '').localeCompare(b.fecha_fin || ''))
    .slice(0, 20)

  const conDesayuno = habitaciones
    .filter(h => h.estado === 'ocupado')
    .map(h => {
      const dias = diasDesayuno(h.fecha_inicio, h.fecha_fin, h.contar_dia_ingreso)
      if (!dias.includes(hoy)) return null
      const overrides = h.desayunos_overrides || {}
      const cantidad = overrides[hoy] !== undefined ? overrides[hoy] : (h.desayunos || 0)
      return cantidad > 0 ? { numero: h.numero, cantidad } : null
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  const totalDesayunos = conDesayuno.reduce((sum, h) => sum + h.cantidad, 0)
  const habsConDesayunoLabel = conDesayuno.map(h => h.numero).join('-')

  // ── Datos de empresa para un día dado ──
  function datosEmpresaParaDia(fecha) {
    const habsActivas = habitaciones.filter(h => {
      if (!h.empresa_id || h.estado === 'libre') return false
      if (!h.fecha_inicio || !h.fecha_fin) return false
      return fecha >= h.fecha_inicio && fecha <= h.fecha_fin
    })
    return empresas.map(emp => {
      const habs = habsActivas.filter(h => h.empresa_id === emp.id)
      if (habs.length === 0) return null
      const totalPersonas = habs.reduce((s, h) => s + (h.personas_empresa || 0), 0)
      const totalDes = habs.reduce((s, h) => {
        const dias = diasDesayuno(h.fecha_inicio, h.fecha_fin, h.contar_dia_ingreso)
        if (!dias.includes(fecha)) return s
        const overrides = h.desayunos_overrides || {}
        return s + (overrides[fecha] !== undefined ? overrides[fecha] : (h.desayunos || 0))
      }, 0)
      const montoAloj = habs.reduce((s, h) =>
        s + (h.personas_empresa || 0) * (h.tarifa_empresa_hab || 0), 0)
      const montoDes = totalDes * precioDesayuno
      const bruto = montoAloj + montoDes
      const total = Math.round(bruto * 1.19)
      const detalleHabs = habs.map(h => {
        const dias = diasDesayuno(h.fecha_inicio, h.fecha_fin, h.contar_dia_ingreso)
        const overrides = h.desayunos_overrides || {}
        const desDia = dias.includes(fecha)
          ? (overrides[fecha] !== undefined ? overrides[fecha] : (h.desayunos || 0))
          : 0
        return {
          numero: h.numero, tipo: h.tipo,
          personas: h.personas_empresa || 0,
          tarifa: h.tarifa_empresa_hab || 0,
          montoAlojDia: (h.personas_empresa || 0) * (h.tarifa_empresa_hab || 0),
          desDia,
        }
      })
      return { emp, habs, totalPersonas, totalDes, bruto, total, detalleHabs }
    }).filter(Boolean)
  }

  const empresasDia = datosEmpresaParaDia(fechaEmp)

  // Días seleccionados: acumulado multi-empresa
  const toggleDia = (fecha) => {
    setDiasSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(fecha)) next.delete(fecha)
      else next.add(fecha)
      return next
    })
  }

  // Para cada empresa, acumular sus días seleccionados
  const resumenSeleccion = empresas.map(emp => {
    if (diasSeleccionados.size === 0) return null
    const diasArr = [...diasSeleccionados].sort()
    let totalPersonasDias = 0, totalDesDias = 0, totalBruto = 0, totalConIva = 0
    const detallesPorDia = []
    for (const fecha of diasArr) {
      const datos = datosEmpresaParaDia(fecha)
      const empData = datos.find(d => d.emp.id === emp.id)
      if (!empData) continue
      totalPersonasDias += empData.totalPersonas
      totalDesDias += empData.totalDes
      totalBruto += empData.bruto
      totalConIva += empData.total
      detallesPorDia.push({ fecha, ...empData })
    }
    if (detallesPorDia.length === 0) return null
    return { emp, diasArr, detallesPorDia, totalPersonasDias, totalDesDias, totalBruto, totalConIva }
  }).filter(Boolean)

  const haySeleccion = diasSeleccionados.size > 0 && resumenSeleccion.length > 0

  const toggleExpanded = (key) => setExpandedEmpresas(prev => ({ ...prev, [key]: !prev[key] }))

  const fmtNav = (iso) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximas acciones</p>

      {reservas.length === 0 && checkouts.length === 0 && (
        <p className="text-sm text-gray-300 italic">Sin pendientes.</p>
      )}

      {reservas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Recibir reserva</p>
          <div className="space-y-1.5">
            {reservas.map(h => (
              <button key={h.id} onClick={() => onSelectHab(h)}
                className="w-full text-left bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 hover:bg-amber-100 transition">
                <p className="text-sm font-medium text-gray-800">Hab. {h.numero} — {h.tipo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {h.fecha_inicio ? `Entrada: ${fmtFecha(h.fecha_inicio)}` : 'Sin fecha asignada'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {checkouts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Confirmar salida</p>
          <div className="space-y-1.5">
            {checkouts.map(h => (
              <button key={h.id} onClick={() => onSelectHab(h)}
                className="w-full text-left bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 hover:bg-purple-100 transition">
                <p className="text-sm font-medium text-gray-800">Hab. {h.numero} — {h.tipo}</p>
                <p className="text-xs text-gray-400 mt-0.5">Salida: {fmtFecha(h.fecha_fin)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {todasSalidas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#224258]/60 uppercase tracking-wider mb-2">Salidas</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {todasSalidas.map(h => (
              <div key={h.id}
                className="w-full bg-[#DDC395]/15 border border-[#DDC395]/40 rounded-xl px-3 py-2 text-xs">
                <p className="font-medium text-gray-700">Hab. {h.numero} — {h.tipo || 'Sin tipo'}</p>
                <p className="text-gray-400 mt-0.5">Salida: {fmtFecha(h.fecha_fin)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desayunos hoy */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Desayunos hoy · {ddMM}
        </p>
        <p className="text-3xl font-semibold text-gray-800">{totalDesayunos}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {conDesayuno.length > 0 ? `Hab. ${habsConDesayunoLabel}` : 'Sin habitaciones con desayuno'}
        </p>
      </div>

      {/* ── EMPRESAS POR DÍA ── */}
      {empresas.length > 0 && (
        <div className="border border-blue-100 rounded-xl overflow-hidden">

          {/* Header con navegación + instrucción de selección */}
          <div className="bg-blue-50 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-[#224258] uppercase tracking-wider">Empresas por día</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setFechaEmp(sumarDias(fechaEmp, -1))}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#224258] hover:bg-blue-100 transition font-bold">‹</button>
                <span className="text-xs font-semibold text-[#224258] min-w-[42px] text-center">
                  {fechaEmp === hoy ? 'Hoy' : fmtNav(fechaEmp)}
                </span>
                <button onClick={() => setFechaEmp(sumarDias(fechaEmp, 1))}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#224258] hover:bg-blue-100 transition font-bold">›</button>
              </div>
            </div>
            {/* Checkbox del día para selección acumulada */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox"
                checked={diasSeleccionados.has(fechaEmp)}
                onChange={() => toggleDia(fechaEmp)}
                className="w-3.5 h-3.5 accent-[#224258]" />
              <span className="text-[10px] text-[#224258]/70">
                {diasSeleccionados.has(fechaEmp) ? 'Día incluido en agrupación' : 'Incluir este día en agrupación'}
              </span>
            </label>
          </div>

          {/* Lista empresas para el día navegado */}
          {empresasDia.length === 0 ? (
            <div className="px-3 py-3">
              <p className="text-xs text-gray-300 italic">Sin empresas activas este día.</p>
            </div>
          ) : (
            <div className="divide-y divide-blue-50">
              {empresasDia.map(({ emp, habs, totalPersonas, totalDes, bruto, total, detalleHabs }) => {
                const cobroKey = `${emp.id}_${fechaEmp}`
                const cobrado = cobrosEmpresa[cobroKey] || false
                const expandKey = `dia_${emp.id}_${fechaEmp}`
                return (
                  <div key={emp.id} className={`transition ${cobrado ? 'bg-emerald-50/60' : 'bg-white'}`}>
                    <div className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => toggleExpanded(expandKey)}
                          className="flex items-center gap-1.5 text-left flex-1 min-w-0">
                          <ChevronIcon open={!!expandedEmpresas[expandKey]} />
                          <span className="text-sm font-semibold text-[#224258] truncate">{emp.nombre}</span>
                        </button>

                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 pl-5">
                        <span>{habs.length} hab. · {totalPersonas} pers.</span>
                        {totalDes > 0 && <span>{totalDes} des.</span>}
                        <span className="font-semibold text-[#224258]">${total.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                    {expandedEmpresas[expandKey] && (
                      <div className="px-3 pb-2.5 space-y-1.5 border-t border-blue-50 pt-2">
                        {detalleHabs.map(dh => (
                          <div key={dh.numero} className="bg-blue-50/60 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-600">
                            <div className="flex justify-between">
                              <span className="font-medium">Hab. {dh.numero}{dh.tipo ? ` — ${dh.tipo}` : ''}</span>
                              <span className="font-semibold text-[#224258]">${dh.montoAlojDia.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-gray-400">
                              <span>{dh.personas} pers. × ${dh.tarifa.toLocaleString('es-CL')}</span>
                              {dh.desDia > 0 && <span>{dh.desDia} des.</span>}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between text-[11px] text-gray-400 pt-1 border-t border-blue-100">
                          <span>Subtotal bruto</span><span>${bruto.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400">
                          <span>IVA 19%</span><span>${Math.round(bruto * 0.19).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-semibold text-[#224258]">
                          <span>Total día</span><span>${total.toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── RESUMEN AGRUPADO (días seleccionados) ── */}
          {haySeleccion && (
            <div className="border-t-2 border-blue-200 bg-blue-50/80">
              <div className="px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#224258] uppercase tracking-wider">
                    Agrupación · {diasSeleccionados.size} {diasSeleccionados.size === 1 ? 'día' : 'días'}
                  </p>
                  <button onClick={() => setDiasSeleccionados(new Set())}
                    className="text-[10px] text-gray-400 hover:text-red-400 transition">
                    Limpiar
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">
                  {[...diasSeleccionados].sort().map(fmtNav).join(' · ')}
                </p>
                {resumenSeleccion.map(({ emp, diasArr, detallesPorDia, totalDesDias, totalBruto, totalConIva }) => {
                  const expandKey = `grupo_${emp.id}`
                  return (
                    <div key={emp.id} className="mb-2 bg-white rounded-xl border border-blue-100 overflow-hidden">
                      <button onClick={() => toggleExpanded(expandKey)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ChevronIcon open={!!expandedEmpresas[expandKey]} />
                          <span className="text-sm font-semibold text-[#224258] truncate">{emp.nombre}</span>
                        </div>
                        <span className="text-sm font-bold text-[#224258] shrink-0 ml-2">
                          ${totalConIva.toLocaleString('es-CL')}
                        </span>
                      </button>
                      {expandedEmpresas[expandKey] && (
                        <div className="px-3 pb-3 space-y-1.5 border-t border-blue-50">
                          {detallesPorDia.map(({ fecha, totalPersonas, totalDes, bruto, total }) => (
                            <div key={fecha} className="flex items-center justify-between text-[11px] pt-1.5">
                              <div className="text-gray-500">
                                <span className="font-medium">{fmtNav(fecha)}</span>
                                <span className="ml-2 text-gray-400">{totalPersonas} pers.{totalDes > 0 ? ` · ${totalDes} des.` : ''}</span>
                              </div>
                              <span className="font-semibold text-gray-700">${total.toLocaleString('es-CL')}</span>
                            </div>
                          ))}
                          <div className="border-t border-blue-100 pt-1.5 space-y-0.5">
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>Subtotal bruto</span><span>${totalBruto.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-gray-400">
                              <span>IVA 19%</span><span>${Math.round(totalBruto * 0.19).toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold text-[#224258]">
                              <span>Total {diasArr.length} días</span><span>${totalConIva.toLocaleString('es-CL')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MENÚ CONFIRMACIÓN DE SALIDA ──────────────────────────────────────────────
function ConfirmSalidaMenu({ hab, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Habitación {hab.numero}</p>
        <h2 className="text-base font-semibold text-gray-900 mb-4">¿Confirmar salida?</h2>
        <p className="text-sm text-gray-500 mb-5">
          La habitación pasará a estado <span className="font-medium text-emerald-600">Libre</span> y quedará disponible para nuevas reservas.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-emerald-700 transition">
            Confirmar salida
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TARJETA HABITACIÓN ───────────────────────────────────────────────────────
function PagoIcon({ hab }) {
  const ep = hab.estado_pago; const est = hab.estado
  if (est === 'libre') return null
  const Cruz = ({ title }) => (
    <span className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center" title={title}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </span>
  )
  const Asterisco = ({ title }) => (
    <span className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center" title={title}>
      <span className="text-white font-bold text-xs leading-none">*</span>
    </span>
  )
  const Tic = ({ color, title }) => (
    <span className={`w-4 h-4 rounded-full ${color} flex items-center justify-center`} title={title}>
      <CheckIcon className="text-white" />
    </span>
  )
  if (est === 'reservado') {
    if (ep === 'no_abonado') return <Cruz title="No abonado" />
    if (ep === 'abonado') return <Tic color="bg-amber-400" title="Abonado" />
    if (ep === 'pagado') return hab.saldo_pendiente_pago
      ? <Asterisco title="Pagado — con diferencia" />
      : <Tic color="bg-emerald-500" title="Pagado" />
  }
  if (est === 'ocupado' || est === 'confirmar_salida') {
    if (ep === 'no_pagado') return <Cruz title="No pagado" />
    if (ep === 'pago_parcial') return <Asterisco title="Pago parcial" />
    if (ep === 'pago_total') return <Tic color="bg-emerald-500" title="Pago total" />
  }
  return null
}

function calcSaldoCard(hab, settings) {
  const precioBase = settings.preciosHab[hab.tipo] || hab.precio_base || 0
  const m = calcMontos({ ...hab, precio_base: precioBase }, settings.precioDesayuno)
  const { total, subtotal, totalUnidadesDesayuno } = m
  const ep = hab.estado_pago
  let saldo = total, pagadoTotal = false
  if (hab.estado === 'reservado') {
    if (ep === 'abonado' && (hab.abono || 0) > 0) saldo = total - (hab.abono || 0)
    if (ep === 'pagado') {
      const diferencia = subtotal - (hab.monto_pagado || 0)
      pagadoTotal = diferencia === 0
      saldo = pagadoTotal ? 0 : total
    }
  }
  if (hab.estado === 'ocupado' || hab.estado === 'confirmar_salida') {
    if (ep === 'pago_total') { saldo = 0; pagadoTotal = true }
    if (ep === 'pago_parcial' && (hab.monto_pagado || 0) > 0) saldo = total - (hab.monto_pagado || 0)
  }
  return { total, saldo, pagadoTotal, totalUnidadesDesayuno }
}

function RoomCard({ hab, onClick, onConfirmSalida, empresas }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const settings = loadSettings()
  const empresa = empresas.find(e => e.id === hab.empresa_id) || null

  const bg = { libre: 'bg-emerald-50', reservado: 'bg-amber-50', ocupado: 'bg-red-50', confirmar_salida: 'bg-purple-50' }
  const ring = { libre: 'border-emerald-100', reservado: 'border-amber-200', ocupado: 'border-red-200', confirmar_salida: 'border-purple-300' }
  const dot = { libre: 'bg-emerald-400', reservado: 'bg-amber-400', ocupado: 'bg-red-500', confirmar_salida: 'bg-purple-500' }

  const handleClick = () => { if (hab.estado === 'confirmar_salida') setShowConfirm(true); else onClick() }

  const mostrarMontos = hab.estado === 'reservado' || hab.estado === 'ocupado' || hab.estado === 'confirmar_salida'
  const { total, saldo, pagadoTotal, totalUnidadesDesayuno } = mostrarMontos ? calcSaldoCard(hab, settings) : {}

  return (
    <>
      <div onClick={handleClick}
        className={`${bg[hab.estado]} border ${ring[hab.estado]} rounded-xl p-2.5 flex flex-col cursor-pointer hover:shadow-sm transition select-none`}
        style={{ width: '152px', height: '148px' }}>

        <div className="flex items-start justify-between mb-0.5">
          <span className="text-sm font-semibold text-gray-800">{hab.numero}</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot[hab.estado]}`} />
            <PagoIcon hab={hab} />
          </div>
        </div>

        <span className="text-[10px] text-gray-400 leading-tight truncate">{hab.tipo || 'Sin tipo'}</span>
        {empresa && (
          <span className="text-[10px] text-blue-500 font-medium leading-tight truncate">{empresa.nombre}</span>
        )}

        {hab.estado === 'confirmar_salida' && (
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 leading-tight">Confirmar salida</span>
        )}
        {hab.estado !== 'libre' && hab.estado !== 'confirmar_salida' && hab.fecha_inicio && (
          <div className="mt-0.5 space-y-px">
            <p className="text-[10px] text-gray-400 leading-tight">✈ {fmtFecha(hab.fecha_inicio)}</p>
            {hab.fecha_fin && <p className="text-[10px] text-gray-400 leading-tight">⬜ {fmtFecha(hab.fecha_fin)}</p>}
          </div>
        )}

        {mostrarMontos && total > 0 && (
          <div className="mt-auto">
            {pagadoTotal ? (
              <span className="text-[10px] font-semibold text-emerald-600 leading-tight">Pagada totalmente</span>
            ) : (
              <p className="text-[10px] text-gray-500 leading-tight">
                <span className="text-gray-400">Saldo </span>
                <span className="font-semibold text-gray-700">${saldo.toLocaleString('es-CL')}</span>
                {saldo !== total && <span className="text-gray-300"> /{total.toLocaleString('es-CL')}</span>}
              </p>
            )}
            {(totalUnidadesDesayuno || 0) > 0 && (
              <p className="text-[10px] text-gray-400 leading-tight">{totalUnidadesDesayuno} des.</p>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmSalidaMenu
          hab={hab}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => { setShowConfirm(false); onConfirmSalida(hab) }}
        />
      )}
    </>
  )
}

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [habitaciones, setHabitaciones] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [cobrosEmpresa, setCobrosEmpresa] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showSiguiente, setShowSiguiente] = useState(false)
  const [settingsVersion, setSettingsVersion] = useState(0)

  useEffect(() => { document.title = 'Hotel Laraquete Reservas' }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('habitaciones-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habitaciones' }, payload => {
        const settings = loadSettings()
        const tipo = tipoDesdeNumero(payload.new.numero, settings.tiposPorNumero) || payload.new.tipo || null
        const precioTipo = tipo ? (settings.preciosHab[tipo] || 0) : 0
        setHabitaciones(prev => prev.map(h =>
          h.id === payload.new.id ? { ...payload.new, tipo, precio_base: precioTipo } : h
        ))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchAll() {
    await Promise.all([fetchHabitaciones(), fetchEmpresas(), fetchCobros()])
  }

  async function fetchHabitaciones() {
    const { data } = await supabase.from('habitaciones').select('*').order('numero')
    const settings = loadSettings()
    const conTipo = (data || []).map(h => {
      const tipo = tipoDesdeNumero(h.numero, settings.tiposPorNumero) || h.tipo || null
      return { ...h, tipo, precio_base: tipo ? (settings.preciosHab[tipo] || 0) : 0 }
    })
    setHabitaciones(conTipo)
    setLoading(false)
    await aplicarTransicionesAutomaticas(conTipo)
  }

  async function fetchEmpresas() {
    const { data } = await supabase.from('empresas').select('*').order('nombre')
    setEmpresas(data || [])
  }

  async function fetchCobros() {
    const { data } = await supabase.from('cobros_empresa_dia').select('*')
    const map = {}
    for (const row of (data || [])) map[`${row.empresa_id}_${row.fecha}`] = row.cobrado
    setCobrosEmpresa(map)
  }

  async function handleToggleCobro(cobroKey) {
    // cobroKey = "uuid_yyyy-mm-dd" — el uuid puede contener guiones, así que
    // separamos por el último guion que antecede a la fecha (yyyy-mm-dd = 10 chars al final)
    const fecha = cobroKey.slice(-10)
    const empresa_id = cobroKey.slice(0, cobroKey.length - 11) // quitar "_yyyy-mm-dd"
    const actual = cobrosEmpresa[cobroKey] || false
    const nuevo = !actual
    setCobrosEmpresa(prev => ({ ...prev, [cobroKey]: nuevo }))
    const { error } = await supabase
      .from('cobros_empresa_dia')
      .upsert({ empresa_id, fecha, cobrado: nuevo }, { onConflict: 'empresa_id,fecha' })
    if (error) {
      setCobrosEmpresa(prev => ({ ...prev, [cobroKey]: actual }))
      console.error('Error cobro:', error.message)
    }
  }

  async function aplicarTransicionesAutomaticas(habs) {
    const nowSCL = nowSantiago()
    const hora = nowSCL.getHours(), minuto = nowSCL.getMinutes()
    const hoy = nowSCL.toISOString().split('T')[0]
    const esDespuesDe12 = hora > 12 || (hora === 12 && minuto >= 0)
    const vencidas = habs.filter(h => {
      if (h.estado !== 'ocupado' || !h.fecha_fin) return false
      if (h.fecha_fin < hoy) return true
      if (h.fecha_fin === hoy && esDespuesDe12) return true
      return false
    })
    for (const h of vencidas)
      await supabase.from('habitaciones').update({ estado: 'confirmar_salida' }).eq('id', h.id)
    if (vencidas.length > 0)
      setHabitaciones(prev => prev.map(h =>
        vencidas.some(v => v.id === h.id) ? { ...h, estado: 'confirmar_salida' } : h
      ))
  }

  async function handleSave(form) {
    if (form._confirmar_salida) { await handleConfirmSalida(form); return }

    const settings = loadSettings()
    const m = calcMontos(form, settings.precioDesayuno)

    let saldoPendiente = false
    if (form.estado === 'reservado' && form.estado_pago === 'pagado')
      saldoPendiente = m.subtotal !== (form.monto_pagado || 0)

    const diasValidos = new Set(m.dias)
    const overridesLimpios = Object.fromEntries(
      Object.entries(form.desayunos_overrides || {}).filter(([dia]) => diasValidos.has(dia))
    )

    // Validar que empresa_id existe en la lista cargada antes de guardar
    // Si no, limpiar para evitar FK error
    const empresaValida = form.empresa_id && empresas.some(e => e.id === form.empresa_id)
    const empresaIdFinal = empresaValida ? form.empresa_id : null

    const payload = {
      ...form,
      empresa_id: empresaIdFinal,
      personas_empresa: empresaIdFinal ? (form.personas_empresa || 0) : 0,
      tarifa_empresa_hab: empresaIdFinal ? (form.tarifa_empresa_hab || 0) : 0,
      desayunos_overrides: overridesLimpios,
      saldo_pendiente_pago: saldoPendiente,
    }
    delete payload.tipo
    delete payload.precio_desayuno
    delete payload._confirmar_salida

    const { error } = await supabase.from('habitaciones').update(payload).eq('id', form.id)
    if (error) { alert('No se pudo guardar: ' + error.message); return }
    setSelected(null)
    fetchHabitaciones()
  }

  async function handleConfirmSalida(hab) {
    const { error } = await supabase.from('habitaciones').update({
      estado: 'libre', fecha_inicio: null, fecha_fin: null,
      desayunos: 0, contar_dia_ingreso: false, desayunos_overrides: {},
      no_cobrar_desayuno: false, no_cobrar_iva: false,
      estado_pago: 'no_abonado', abono: 0, monto_pagado: 0, saldo_pendiente_pago: false,
      empresa_id: null, personas_empresa: 0, tarifa_empresa_hab: 0,
    }).eq('id', hab.id)
    if (error) { alert('No se pudo confirmar la salida: ' + error.message); return }
    setSelected(null)
    fetchHabitaciones()
  }

  const pendingCount = habitaciones.filter(h => {
    const hoy = nowSantiago().toISOString().split('T')[0]
    return h.estado === 'reservado' || h.estado === 'confirmar_salida' ||
      (h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy)
  }).length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400 tracking-wide">Cargando habitaciones...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative bg-[#224258] px-5 py-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-center">
          <img src="/logo-hotel-laraquete.png" alt="Hotel Laraquete" className="h-10 sm:h-11 object-contain" />
        </div>
        <button onClick={() => setShowSettings(true)}
          className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#DDC395] hover:text-white transition"
          title="Configuración">
          <GearIcon />
        </button>
      </header>

      <div className="flex">
        <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6">
          <div className="flex items-center gap-5 mb-4 flex-wrap">
            {[['bg-emerald-400','Libre'],['bg-amber-400','Reservado'],['bg-red-500','Ocupado'],['bg-purple-500','Confirmar salida']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${c}`} /><span className="text-xs text-gray-400">{l}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, 152px)' }}>
            {habitaciones.map(hab => (
              <RoomCard key={hab.id} hab={hab} onClick={() => setSelected(hab)}
                onConfirmSalida={handleConfirmSalida} empresas={empresas} />
            ))}
          </div>
        </main>

        <aside className="hidden lg:block w-72 shrink-0 border-l border-gray-100 bg-white p-5 min-h-[calc(100vh-53px)] overflow-y-auto">
          <SiguientePanel habitaciones={habitaciones} onSelectHab={h => setSelected(h)}
            empresas={empresas} cobrosEmpresa={cobrosEmpresa} onToggleCobro={handleToggleCobro} />
        </aside>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 shadow-lg">
        <button onClick={() => setShowSiguiente(!showSiguiente)}
          className="w-full flex items-center justify-between px-5 py-3.5">
          <span className="text-sm font-semibold text-gray-700">Siguiente</span>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`text-gray-400 transition-transform duration-200 ${showSiguiente ? 'rotate-180' : ''}`}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
        </button>
        {showSiguiente && (
          <div className="px-5 pb-5 pt-3 max-h-96 overflow-y-auto border-t border-gray-100">
            <SiguientePanel habitaciones={habitaciones}
              onSelectHab={h => { setSelected(h); setShowSiguiente(false) }}
              empresas={empresas} cobrosEmpresa={cobrosEmpresa} onToggleCobro={handleToggleCobro} />
          </div>
        )}
      </div>

      {selected && (
        <RoomModal hab={selected} onClose={() => setSelected(null)} onSave={handleSave} empresas={empresas} />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => { setSettingsVersion(v => v + 1); fetchHabitaciones() }}
          empresas={empresas}
          onEmpresasChange={setEmpresas}
        />
      )}
    </div>
  )
}
