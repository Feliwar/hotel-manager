import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const TIPOS = ['Individual', 'Doble', 'Matrimonial', 'Triple', 'Matrimonial+1']

// ── Helpers settings (localStorage) ─────────────────────────────────────────
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

// Formatea fecha ISO yyyy-mm-dd → dd-mm-aaaa
function fmtFecha(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

// Calcula noches entre dos fechas ISO
function calcNochesFechas(inicio, fin) {
  if (!inicio || !fin) return 0
  const a = new Date(inicio)
  const b = new Date(fin)
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

// Obtiene hora actual en Santiago CL
function nowSantiago() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

// ── CÁLCULO CENTRAL DE MONTOS ────────────────────────────────────────────────
// Dado el form, devuelve todos los valores relevantes para desglose y saldos
function calcMontos(form, precioDesayuno) {
  const noches = calcNochesFechas(form.fecha_inicio, form.fecha_fin)
  const precioHab = (form.precio_base || 0) * Math.max(noches, 1)

  // Desayunos: total - descuentos por día
  const desayunosPorNoche = form.desayunos || 0
  const descuentosDesayuno = form.descuentos_desayuno || 0  // días sin cobrar desayuno
  const nochesDesayuno = Math.max(0, Math.max(noches, 1) - descuentosDesayuno)
  const desayunosBruto = desayunosPorNoche * nochesDesayuno * precioDesayuno
  const desayunosAplicado = form.no_cobrar_desayuno ? 0 : desayunosBruto

  // Subtotal bruto (sin IVA)
  const subtotal = precioHab + desayunosAplicado

  const ivaBase = subtotal * 0.19
  const ivaAplicado = form.no_cobrar_iva ? 0 : ivaBase
  const total = Math.round(subtotal + ivaAplicado)

  // Abono: se descuenta del total (post-IVA), pero fue ingresado al valor bruto
  const abono = form.abono || 0
  const montoPagado = form.monto_pagado || 0

  // Saldo tras abono (reservado): total - abono
  const saldoTrasAbono = total - abono

  // Para reservado/pagado: comparar monto_pagado contra subtotal (sin IVA)
  const diferenciaPagadoReservado = subtotal - montoPagado

  return {
    noches,
    precioHab,
    desayunosPorNoche,
    nochesDesayuno,
    descuentosDesayuno,
    desayunosBruto,
    desayunosAplicado,
    subtotal,
    ivaBase,
    ivaAplicado,
    total,
    abono,
    montoPagado,
    saldoTrasAbono,
    diferenciaPagadoReservado,
  }
}

// ── Ícono engranaje ──────────────────────────────────────────────────────────
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

// ── MODAL CONFIGURACIÓN ──────────────────────────────────────────────────────
function SettingsModal({ onClose, onSaved }) {
  const saved = loadSettings()
  const [precioDesayuno, setPrecioDesayuno] = useState(saved.precioDesayuno)
  const [preciosHab, setPreciosHab] = useState(saved.preciosHab)
  const [tiposPorNumero, setTiposPorNumero] = useState(saved.tiposPorNumero)

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
          <h2 className="text-base font-semibold text-gray-900">Configuración</h2>
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

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={guardar}
            className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MODAL HABITACIÓN ─────────────────────────────────────────────────────────
function RoomModal({ hab, onClose, onSave }) {
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
    descuentos_desayuno: 0,
    ...hab,
    precio_base: precioBase,
  })

  // Selector de fechas integrado: fase 'inicio' → muestra picker entrada,
  // al elegir entrada pasa automáticamente a 'fin', ambos pickers siempre visibles
  const [fechaFase, setFechaFase] = useState('inicio')

  const esReservado = form.estado === 'reservado'
  const esOcupado = form.estado === 'ocupado'
  const esLibre = form.estado === 'libre'
  const esConfirmarSalida = form.estado === 'confirmar_salida'
  const mostrarFormulario = esReservado || esOcupado || esConfirmarSalida

  const m = calcMontos(form, precioDesayuno)

  const set = (field, value) => {
    setForm(prev => {
      const u = { ...prev, [field]: value }
      if (field === 'estado' && value === 'libre') {
        u.fecha_inicio = null
        u.fecha_fin = null
      }
      if (field === 'estado_pago') {
        if (['no_abonado', 'no_pagado', 'pago_total'].includes(value)) {
          u.abono = 0
          u.monto_pagado = 0
        }
        if (value === 'abonado') u.monto_pagado = 0
        if (value === 'pagado') u.abono = 0
        if (value === 'pago_parcial') u.abono = 0
      }
      return u
    })
  }

  const labelPago = {
    no_abonado: 'No abonado', abonado: 'Abonado', pagado: 'Pagado',
    no_pagado: 'No pagado', pago_parcial: 'Pago parcial', pago_total: 'Pago total',
  }

  const maxDescuentos = Math.max(0, m.noches || 1)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[92vh]">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Habitación</p>
            <h2 className="text-xl font-semibold text-gray-900">{hab.numero}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Tipo (solo lectura) y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo</label>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                {form.tipo || 'Sin asignar'}
              </div>
            </div>
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
          </div>
          <p className="text-xs text-gray-400 -mt-2">El tipo se asigna en Configuración → Habitaciones por tipo.</p>

          {/* Acción contextual principal */}
          {esReservado && (
            <button
              onClick={() => { set('estado', 'ocupado'); set('estado_pago', 'no_pagado') }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: '#B8860B', color: '#fff' }}>
              Llegó la reserva
            </button>
          )}
          {(esOcupado || esConfirmarSalida) && (
            <button
              onClick={() => onSave({ ...form, _confirmar_salida: true })}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: '#7C3AED', color: '#fff' }}>
              Confirmar salida
            </button>
          )}

          {/* Fechas — selector integrado en un solo bloque */}
          {mostrarFormulario && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {/* Tabs entrada / salida */}
              <div className="flex gap-1 mb-1">
                {['inicio', 'fin'].map(fase => (
                  <button key={fase}
                    onClick={() => setFechaFase(fase)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                      fechaFase === fase
                        ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                        : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                    {fase === 'inicio' ? 'Entrada' : 'Salida'}
                  </button>
                ))}
              </div>
              {/* Fechas seleccionadas */}
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
              {/* Picker único — siempre visible, cambia según fase */}
              <input
                key={fechaFase}
                type="date"
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none"
                value={fechaFase === 'inicio' ? (form.fecha_inicio || '') : (form.fecha_fin || '')}
                min={fechaFase === 'fin' ? (form.fecha_inicio || undefined) : undefined}
                onChange={e => {
                  const val = e.target.value
                  if (fechaFase === 'inicio') {
                    set('fecha_inicio', val)
                    setFechaFase('fin')   // pasa automáticamente a salida
                  } else {
                    set('fecha_fin', val)
                    // no cierra — el usuario puede corregir si quiere
                  }
                }}
              />
            </div>
          )}

          {/* Desayunos */}
          {mostrarFormulario && (
            <div className="space-y-2">
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Desayunos por noche</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none"
                value={form.desayunos || 0} onChange={e => set('desayunos', parseInt(e.target.value))}>
                <option value={0}>Ninguno</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              {(form.desayunos || 0) > 0 && precioDesayuno > 0 && (
                <p className="text-xs text-gray-400">Precio c/u: ${precioDesayuno.toLocaleString('es-CL')} · definido en Configuración</p>
              )}

              {/* Descontar días sin desayuno */}
              {(form.desayunos || 0) > 0 && m.noches > 1 && (
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Días sin desayuno (descuento)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => set('descuentos_desayuno', Math.max(0, (form.descuentos_desayuno || 0) - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-lg font-medium flex items-center justify-center transition">−</button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-800">{form.descuentos_desayuno || 0}</span>
                    <button
                      onClick={() => set('descuentos_desayuno', Math.min(maxDescuentos - 1, (form.descuentos_desayuno || 0) + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-lg font-medium flex items-center justify-center transition">+</button>
                    <span className="text-xs text-gray-400 ml-1">de {m.noches} noches</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkboxes exenciones */}
          {mostrarFormulario && (
            <div className="flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={!!form.no_cobrar_desayuno}
                  onChange={e => set('no_cobrar_desayuno', e.target.checked)}
                  className="w-4 h-4 accent-gray-800" />
                <span className="text-sm text-gray-600">No cobrar desayuno</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={!!form.no_cobrar_iva}
                  onChange={e => set('no_cobrar_iva', e.target.checked)}
                  className="w-4 h-4 accent-gray-800" />
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
                          : ep === 'pago_parcial' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                    {labelPago[ep]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monto abonado (reservado + abonado) */}
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

          {/* Monto pagado (reservado + pagado) */}
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

          {/* Monto pago parcial (ocupado) */}
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

          {/* ── DESGLOSE ── */}
          {mostrarFormulario && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">

              {/* Habitación × noches */}
              <div className="flex justify-between text-gray-500">
                <span>Habitación{m.noches > 1 ? ` ×${m.noches} noches` : ''}</span>
                <span>${m.precioHab.toLocaleString('es-CL')}</span>
              </div>

              {/* Desayunos */}
              {(form.desayunos || 0) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>
                    Desayunos ×{form.desayunos} ×{m.nochesDesayuno} noche{m.nochesDesayuno !== 1 ? 's' : ''}
                    {m.descuentosDesayuno > 0 ? ` (−${m.descuentosDesayuno} día${m.descuentosDesayuno !== 1 ? 's' : ''})` : ''}
                    {form.no_cobrar_desayuno ? ' — exento' : ''}
                  </span>
                  <span className={form.no_cobrar_desayuno ? 'line-through text-gray-300' : ''}>
                    ${m.desayunosBruto.toLocaleString('es-CL')}
                  </span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between text-gray-600 font-medium border-t border-gray-200 pt-2">
                <span>Subtotal bruto</span>
                <span>${m.subtotal.toLocaleString('es-CL')}</span>
              </div>

              {/* Abono (se descuenta del subtotal bruto antes del IVA) */}
              {esReservado && form.estado_pago === 'abonado' && m.abono > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>− Abono</span>
                  <span>−${m.abono.toLocaleString('es-CL')}</span>
                </div>
              )}

              {/* IVA — se aplica sobre subtotal completo */}
              <div className="flex justify-between text-gray-500">
                <span>IVA 19%{form.no_cobrar_iva ? ' — exento' : ''}</span>
                <span className={form.no_cobrar_iva ? 'line-through text-gray-300' : ''}>
                  ${Math.round(m.ivaBase).toLocaleString('es-CL')}
                </span>
              </div>

              {/* Total */}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>${m.total.toLocaleString('es-CL')}</span>
              </div>

              {/* Saldo reservado con abono */}
              {esReservado && form.estado_pago === 'abonado' && m.abono > 0 && (
                <div className="flex justify-between font-medium text-amber-600">
                  <span>Saldo pendiente</span>
                  <span>${Math.max(0, m.saldoTrasAbono).toLocaleString('es-CL')}</span>
                </div>
              )}

              {/* Monto pagado reservado (comparado contra subtotal bruto) */}
              {esReservado && form.estado_pago === 'pagado' && m.montoPagado > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Monto pagado (bruto)</span>
                    <span>${m.montoPagado.toLocaleString('es-CL')}</span>
                  </div>
                  {m.diferenciaPagadoReservado !== 0 && (
                    <div className="flex justify-between font-medium text-amber-600">
                      <span>Diferencia</span>
                      <span>${Math.abs(m.diferenciaPagadoReservado).toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  {m.diferenciaPagadoReservado === 0 && (
                    <div className="flex justify-between font-medium text-emerald-600">
                      <span>Sin diferencia</span>
                      <span>$0</span>
                    </div>
                  )}
                </>
              )}

              {/* Pago parcial ocupado */}
              {(esOcupado || esConfirmarSalida) && form.estado_pago === 'pago_parcial' && m.montoPagado > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Pagado</span>
                    <span>−${m.montoPagado.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between font-medium text-amber-600">
                    <span>Saldo pendiente</span>
                    <span>${Math.max(0, m.total - m.montoPagado).toLocaleString('es-CL')}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pb-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => onSave(form)}
              className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition">
              Guardar
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── PANEL SIGUIENTE ──────────────────────────────────────────────────────────
function SiguientePanel({ habitaciones, onSelectHab }) {
  const nowSCL = nowSantiago()
  const hoy = nowSCL.toISOString().split('T')[0]
  const ddMM = `${String(nowSCL.getDate()).padStart(2, '0')}/${String(nowSCL.getMonth() + 1).padStart(2, '0')}`

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
    .filter(h => (h.estado === 'ocupado' || h.estado === 'reservado') && (h.desayunos || 0) > 0)
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  const totalDesayunos = conDesayuno.reduce((sum, h) => sum + (h.desayunos || 0), 0)
  const habsConDesayunoLabel = conDesayuno.map(h => h.numero).join('-')

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

      {/* Salidas informativas */}
      {todasSalidas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Salidas</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {todasSalidas.map(h => (
              <div key={h.id}
                className="w-full bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs">
                <p className="font-medium text-gray-700">Hab. {h.numero} — {h.tipo || 'Sin tipo'}</p>
                <p className="text-gray-400 mt-0.5">Salida: {fmtFecha(h.fecha_fin)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desayunos */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Desayunos hoy · {ddMM}
        </p>
        <p className="text-3xl font-semibold text-gray-800">{totalDesayunos}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {conDesayuno.length > 0 ? `Hab. ${habsConDesayunoLabel}` : 'Sin habitaciones con desayuno'}
        </p>
      </div>
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
  const ep = hab.estado_pago
  const est = hab.estado
  if (est === 'libre') return null

  const Cruz = ({ title }) => (
    <span className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center" title={title}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </span>
  )
  const Asterisco = ({ title }) => (
    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center" title={title}>
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

// Calcula saldo/total a mostrar en la tarjeta del grid
function calcSaldoCard(hab, settings) {
  const noches = calcNochesFechas(hab.fecha_inicio, hab.fecha_fin)
  const precioBase = settings.preciosHab[hab.tipo] || hab.precio_base || 0
  const precioHab = precioBase * Math.max(noches, 1)
  const desayunosPorNoche = hab.desayunos || 0
  const descuentos = hab.descuentos_desayuno || 0
  const nochesDesayuno = Math.max(0, Math.max(noches, 1) - descuentos)
  const desayunosAplicado = hab.no_cobrar_desayuno ? 0 : desayunosPorNoche * nochesDesayuno * settings.precioDesayuno
  const subtotal = precioHab + desayunosAplicado
  const ivaAplicado = hab.no_cobrar_iva ? 0 : subtotal * 0.19
  const total = Math.round(subtotal + ivaAplicado)

  const ep = hab.estado_pago
  let saldo = total
  let pagadoTotal = false

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

  return { total, saldo, pagadoTotal }
}

function RoomCard({ hab, onClick, onConfirmSalida }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const settings = loadSettings()

  const bg = {
    libre: 'bg-emerald-50', reservado: 'bg-amber-50',
    ocupado: 'bg-red-50', confirmar_salida: 'bg-purple-50',
  }
  const ring = {
    libre: 'border-emerald-100', reservado: 'border-amber-200',
    ocupado: 'border-red-200', confirmar_salida: 'border-purple-300',
  }
  const dot = {
    libre: 'bg-emerald-400', reservado: 'bg-amber-400',
    ocupado: 'bg-red-500', confirmar_salida: 'bg-purple-500',
  }

  const handleClick = () => {
    if (hab.estado === 'confirmar_salida') setShowConfirm(true)
    else onClick()
  }

  const mostrarMontos = hab.estado === 'reservado' || hab.estado === 'ocupado' || hab.estado === 'confirmar_salida'
  const { total, saldo, pagadoTotal } = mostrarMontos ? calcSaldoCard(hab, settings) : {}

  return (
    <>
      <div onClick={handleClick}
        className={`${bg[hab.estado]} border ${ring[hab.estado]} rounded-xl p-3 flex flex-col cursor-pointer hover:shadow-sm transition select-none`}
        style={{ width: '152px', height: '148px' }}>

        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-gray-800">{hab.numero}</span>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot[hab.estado]}`} />
        </div>

        <div className="flex justify-end mb-0.5" style={{ minHeight: '16px' }}>
          <PagoIcon hab={hab} />
        </div>

        <span className="text-xs text-gray-400 leading-snug">{hab.tipo || 'Sin tipo'}</span>

        {hab.estado === 'confirmar_salida' && (
          <span className="text-xs text-purple-600 font-medium mt-0.5">Confirmar salida</span>
        )}
        {hab.estado !== 'libre' && hab.estado !== 'confirmar_salida' && hab.fecha_inicio && (
          <span className="text-xs text-gray-400 mt-0.5">{fmtFecha(hab.fecha_inicio)}</span>
        )}

        {/* Saldo / total en grid */}
        {mostrarMontos && total > 0 && (
          <div className="mt-auto pt-1">
            {pagadoTotal ? (
              <span className="text-xs font-semibold text-emerald-600">Pagada totalmente</span>
            ) : (
              <>
                <span className="text-xs text-gray-400">Saldo </span>
                <span className="text-xs font-semibold text-gray-700">${saldo.toLocaleString('es-CL')}</span>
                {saldo !== total && (
                  <span className="text-xs text-gray-300"> /{total.toLocaleString('es-CL')}</span>
                )}
              </>
            )}
            {(hab.desayunos || 0) > 0 && (
              <span className="block text-xs text-gray-400">{hab.desayunos} des.</span>
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
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showSiguiente, setShowSiguiente] = useState(false)
  const [settingsVersion, setSettingsVersion] = useState(0)

  useEffect(() => {
    fetchHabitaciones()
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

  async function aplicarTransicionesAutomaticas(habs) {
    const nowSCL = nowSantiago()
    const hora = nowSCL.getHours()
    const minuto = nowSCL.getMinutes()
    const hoy = nowSCL.toISOString().split('T')[0]
    const esDespuesDe12 = hora > 12 || (hora === 12 && minuto >= 0)

    const vencidas = habs.filter(h => {
      if (h.estado !== 'ocupado' || !h.fecha_fin) return false
      if (h.fecha_fin < hoy) return true
      if (h.fecha_fin === hoy && esDespuesDe12) return true
      return false
    })
    for (const h of vencidas) {
      await supabase.from('habitaciones').update({ estado: 'confirmar_salida' }).eq('id', h.id)
    }
    if (vencidas.length > 0) {
      setHabitaciones(prev => prev.map(h =>
        vencidas.some(v => v.id === h.id) ? { ...h, estado: 'confirmar_salida' } : h
      ))
    }
  }

  async function handleSave(form) {
    // Si viene señal de confirmar salida desde el modal
    if (form._confirmar_salida) {
      await handleConfirmSalida(form)
      return
    }

    const settings = loadSettings()
    const noches = calcNochesFechas(form.fecha_inicio, form.fecha_fin)
    const precioHab = (form.precio_base || 0) * Math.max(noches, 1)
    const descuentos = form.descuentos_desayuno || 0
    const nochesDesayuno = Math.max(0, Math.max(noches, 1) - descuentos)
    const desayunosAplicado = form.no_cobrar_desayuno ? 0 : (form.desayunos || 0) * nochesDesayuno * settings.precioDesayuno
    const subtotal = precioHab + desayunosAplicado

    let saldoPendiente = false
    if (form.estado === 'reservado' && form.estado_pago === 'pagado') {
      saldoPendiente = subtotal !== (form.monto_pagado || 0)
    }

    const payload = { ...form, saldo_pendiente_pago: saldoPendiente }
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
      desayunos: 0, descuentos_desayuno: 0,
      no_cobrar_desayuno: false, no_cobrar_iva: false,
      estado_pago: 'no_abonado', abono: 0, monto_pagado: 0, saldo_pendiente_pago: false,
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
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">Hotel Manager</h1>
        <button onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          title="Configuración">
          <GearIcon />
        </button>
      </header>

      <div className="flex">
        <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6">
          <div className="flex items-center gap-5 mb-4 flex-wrap">
            {[
              ['bg-emerald-400', 'Libre'],
              ['bg-amber-400', 'Reservado'],
              ['bg-red-500', 'Ocupado'],
              ['bg-purple-500', 'Confirmar salida'],
            ].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
                <span className="text-xs text-gray-400">{l}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, 152px)' }}>
            {habitaciones.map(hab => (
              <RoomCard key={hab.id} hab={hab} onClick={() => setSelected(hab)} onConfirmSalida={handleConfirmSalida} />
            ))}
          </div>
        </main>

        <aside className="hidden lg:block w-64 shrink-0 border-l border-gray-100 bg-white p-5 min-h-[calc(100vh-53px)]">
          <SiguientePanel habitaciones={habitaciones} onSelectHab={h => setSelected(h)} />
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
          <div className="px-5 pb-5 pt-3 max-h-72 overflow-y-auto border-t border-gray-100">
            <SiguientePanel habitaciones={habitaciones}
              onSelectHab={h => { setSelected(h); setShowSiguiente(false) }} />
          </div>
        )}
      </div>

      {selected && (
        <RoomModal hab={selected} onClose={() => setSelected(null)} onSave={handleSave} />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => { setSettingsVersion(v => v + 1); fetchHabitaciones() }}
        />
      )}
    </div>
  )
}
