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

// Convierte el string "1,7,8,9" en un set de números de habitación
function parseNumerosList(str) {
  return new Set(
    (str || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  )
}

// Dado un número de habitación y el mapeo tipo→string de números, devuelve el tipo
function tipoDesdeNumero(numero, tiposPorNumero) {
  for (const tipo of TIPOS) {
    const set = parseNumerosList(tiposPorNumero[tipo])
    if (set.has(String(numero))) return tipo
  }
  return null
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
          <input
            type="number"
            className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
            value={precioDesayuno || ''}
            placeholder="0"
            onChange={e => setPrecioDesayuno(parseFloat(e.target.value) || 0)}
          />
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Precio base por tipo</p>
        <div className="space-y-2 mb-6">
          {TIPOS.map(tipo => (
            <div key={tipo} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-32 shrink-0">{tipo}</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1">
                <span className="px-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5">$</span>
                <input
                  type="number"
                  className="flex-1 px-2 py-1.5 text-sm text-gray-900 focus:outline-none"
                  value={preciosHab[tipo] || ''}
                  placeholder="0"
                  onChange={e => setPreciosHab(p => ({ ...p, [tipo]: parseFloat(e.target.value) || 0 }))}
                />
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
              <input
                type="text"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                value={tiposPorNumero[tipo] || ''}
                placeholder="1,7,8,9"
                onChange={e => setTiposPorNumero(p => ({ ...p, [tipo]: e.target.value }))}
              />
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
  const [form, setForm] = useState({
    no_cobrar_desayuno: false,
    no_cobrar_iva: false,
    estado_pago: 'no_abonado',
    abono: 0,
    monto_pagado: 0,
    ...hab,
    precio_base: hab.precio_base || settings.preciosHab[hab.tipo] || 0,
  })

  const precioDesayuno = settings.precioDesayuno
  const desayunosBruto = (form.desayunos || 0) * precioDesayuno
  const desayunosAplicado = form.no_cobrar_desayuno ? 0 : desayunosBruto
  const baseTotal = (form.precio_base || 0) + desayunosAplicado
  const ivaBase = baseTotal * 0.19
  const ivaAplicado = form.no_cobrar_iva ? 0 : ivaBase
  const total = Math.round(baseTotal + ivaAplicado)

  const saldoAbono = total - (form.abono || 0)
  const saldoPagado = total - (form.monto_pagado || 0)

  const set = (field, value) => {
    setForm(prev => {
      const u = { ...prev, [field]: value }
      if (field === 'estado' && value === 'libre') {
        u.fecha_inicio = null
        u.fecha_fin = null
      }
      if (field === 'estado_pago') {
        // Al cambiar de estado de pago, limpiar el monto que no corresponde
        if (value === 'no_abonado') {
          u.abono = 0
          u.monto_pagado = 0
        }
        if (value === 'abonado') {
          u.monto_pagado = 0
        }
        if (value === 'pagado') {
          u.abono = 0
        }
      }
      return u
    })
  }

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

          {/* Fechas */}
          {form.estado !== 'libre' && (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-400">Entrada</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none"
                  value={form.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-400">Salida</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none"
                  value={form.fecha_fin || ''} onChange={e => set('fecha_fin', e.target.value)} />
              </div>
            </div>
          )}

          {/* Precio base */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Precio base</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
              <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                value={form.precio_base || ''} placeholder="0"
                onChange={e => set('precio_base', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Desayunos */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Desayunos</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none"
              value={form.desayunos || 0} onChange={e => set('desayunos', parseInt(e.target.value))}>
              <option value={0}>Ninguno</option>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {(form.desayunos || 0) > 0 && (
              <p className="text-xs text-gray-400 mt-1">Precio c/u: ${precioDesayuno.toLocaleString('es-CL')} (definido en Configuración)</p>
            )}
          </div>

          {/* Checkboxes exenciones */}
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

          {/* Estado de pago */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado del pago</label>
            <div className="flex gap-2">
              <button onClick={() => set('estado_pago', 'no_abonado')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.estado_pago === 'no_abonado'
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                No abonado
              </button>
              <button onClick={() => set('estado_pago', 'abonado')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.estado_pago === 'abonado'
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                Abonado
              </button>
              <button onClick={() => set('estado_pago', 'pagado')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.estado_pago === 'pagado'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                Pagado
              </button>
            </div>
          </div>

          {/* Abono (solo si estado_pago = abonado) */}
          {form.estado_pago === 'abonado' && (
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Monto abonado</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
                <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  value={form.abono || ''} placeholder="0"
                  onChange={e => set('abono', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {/* Monto pagado (solo si estado_pago = pagado) */}
          {form.estado_pago === 'pagado' && (
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
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2.5">
            <div className="flex justify-between text-gray-500">
              <span>Habitación</span>
              <span>${(form.precio_base || 0).toLocaleString('es-CL')}</span>
            </div>
            {(form.desayunos || 0) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Desayunos ×{form.desayunos}{form.no_cobrar_desayuno ? ' — exento' : ''}</span>
                <span className={form.no_cobrar_desayuno ? 'line-through text-gray-300' : ''}>
                  ${desayunosBruto.toLocaleString('es-CL')}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>${baseTotal.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IVA 19%{form.no_cobrar_iva ? ' — exento' : ''}</span>
              <span className={form.no_cobrar_iva ? 'line-through text-gray-300' : ''}>
                ${Math.round(ivaBase).toLocaleString('es-CL')}
              </span>
            </div>
            {form.estado_pago === 'abonado' && (form.abono || 0) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Abono</span>
                <span>−${(form.abono || 0).toLocaleString('es-CL')}</span>
              </div>
            )}
            {form.estado_pago === 'pagado' && (form.monto_pagado || 0) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Monto pagado</span>
                <span>−${(form.monto_pagado || 0).toLocaleString('es-CL')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2.5">
              <span>Total</span>
              <span>${total.toLocaleString('es-CL')}</span>
            </div>
            {form.estado_pago === 'abonado' && saldoAbono > 0 && (
              <div className="flex justify-between font-medium text-orange-600">
                <span>Saldo pendiente</span>
                <span>${saldoAbono.toLocaleString('es-CL')}</span>
              </div>
            )}
            {form.estado_pago === 'pagado' && saldoPagado !== 0 && (
              <div className="flex justify-between font-medium text-amber-600">
                <span>Saldo pendiente</span>
                <span>${saldoPagado.toLocaleString('es-CL')}</span>
              </div>
            )}
            {form.estado_pago === 'pagado' && saldoPagado === 0 && (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>Sin diferencia</span>
                <span>$0</span>
              </div>
            )}
          </div>

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
  const hoy = new Date().toISOString().split('T')[0]

  const reservas = habitaciones
    .filter(h => h.estado === 'reservado')
    .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))

  const checkouts = habitaciones
    .filter(h => h.estado === 'confirmar_salida' || (h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy))
    .sort((a, b) => (a.fecha_fin || '').localeCompare(b.fecha_fin || ''))

  const conDesayuno = habitaciones
    .filter(h => h.estado === 'ocupado' && (h.desayunos || 0) > 0)
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  const totalDesayunos = conDesayuno.reduce((sum, h) => sum + (h.desayunos || 0), 0)
  const habsConDesayunoLabel = conDesayuno.map(h => h.numero).join('-')

  const estadoPagoLabel = { pagado: 'Pagado', abonado: 'Abonado', no_abonado: 'No abonado' }

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
                  {h.fecha_inicio ? `Entrada: ${h.fecha_inicio}` : 'Sin fecha asignada'}
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
                <p className="text-xs text-gray-400 mt-0.5">
                  Salida: {h.fecha_fin} · {estadoPagoLabel[h.estado_pago] || 'No abonado'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Desayunos totales hoy</p>
        <p className="text-3xl font-semibold text-gray-800">{totalDesayunos}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {conDesayuno.length > 0 ? `Hab. ${habsConDesayunoLabel}` : 'Sin habitaciones con desayuno'}
        </p>
      </div>
    </div>
  )
}

// ── ÍCONO TIC ────────────────────────────────────────────────────────────────
function CheckIcon({ className }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── MENÚ CONFIRMACIÓN DE SALIDA ──────────────────────────────────────────────
function ConfirmSalidaMenu({ hab, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
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
function RoomCard({ hab, onClick, onConfirmSalida }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const dot = {
    libre: 'bg-emerald-400',
    reservado: 'bg-amber-400',
    ocupado: 'bg-red-600',
    confirmar_salida: 'bg-purple-500',
  }
  const ring = {
    libre: 'border-gray-100',
    reservado: 'border-amber-200',
    ocupado: 'border-red-300',
    confirmar_salida: 'border-purple-300',
  }
  const bg = {
    libre: 'bg-white',
    reservado: 'bg-white',
    ocupado: 'bg-white',
    confirmar_salida: 'bg-purple-50',
  }

  const handleClick = () => {
    if (hab.estado === 'confirmar_salida') {
      setShowConfirm(true)
    } else {
      onClick()
    }
  }

  return (
    <>
      <div onClick={handleClick}
        className={`${bg[hab.estado]} border ${ring[hab.estado]} rounded-xl p-3 flex flex-col cursor-pointer hover:shadow-sm transition select-none`}
        style={{ width: '152px', height: '140px' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-gray-800">{hab.numero}</span>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot[hab.estado]}`} />
        </div>

        {/* Tic de pago, justo debajo del círculo de estado */}
        <div className="flex justify-end mb-1" style={{ minHeight: '11px' }}>
          {hab.estado_pago === 'abonado' && (
            <span className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center" title="Abonado">
              <CheckIcon className="text-white" />
            </span>
          )}
          {hab.estado_pago === 'pagado' && (
            <span className="flex items-center gap-0.5" title={hab.saldo_pendiente_pago ? 'Pagado — con diferencia' : 'Pagado'}>
              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckIcon className="text-white" />
              </span>
              {!hab.saldo_pendiente_pago && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center -ml-1.5">
                  <CheckIcon className="text-white" />
                </span>
              )}
            </span>
          )}
        </div>

        <span className="text-xs text-gray-400 leading-snug">{hab.tipo || 'Sin tipo'}</span>

        {hab.estado === 'confirmar_salida' && (
          <span className="text-xs text-purple-600 font-medium mt-1">Confirmar salida</span>
        )}
        {hab.estado !== 'libre' && hab.estado !== 'confirmar_salida' && hab.fecha_inicio && (
          <span className="text-xs text-gray-400 mt-1">{hab.fecha_inicio}</span>
        )}

        {(hab.precio_base || 0) > 0 && (
          <span className="text-xs text-gray-500 mt-auto pt-2">
            ${hab.precio_base.toLocaleString('es-CL')}
          </span>
        )}
        {(hab.desayunos || 0) > 0 && (
          <span className="text-xs text-gray-400">{hab.desayunos} des.</span>
        )}
        {hab.estado_pago === 'no_abonado' && hab.estado !== 'libre' && (
          <span className="text-xs text-amber-500 font-medium mt-0.5">Por cobrar</span>
        )}
      </div>

      {showConfirm && (
        <ConfirmSalidaMenu
          hab={hab}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false)
            onConfirmSalida(hab)
          }}
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
        const habActualizada = {
          ...payload.new,
          tipo,
          precio_base: (payload.new.precio_base || 0) > 0 ? payload.new.precio_base : precioTipo,
        }
        setHabitaciones(prev => prev.map(h => h.id === habActualizada.id ? habActualizada : h))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchHabitaciones() {
    const { data } = await supabase.from('habitaciones').select('*').order('numero')
    const settings = loadSettings()
    const conTipo = (data || []).map(h => {
      const tipo = tipoDesdeNumero(h.numero, settings.tiposPorNumero) || h.tipo || null
      const precioTipo = tipo ? (settings.preciosHab[tipo] || 0) : 0
      return {
        ...h,
        tipo,
        // Si la habitación no tiene precio propio guardado, refleja el precio del tipo (Settings)
        precio_base: (h.precio_base || 0) > 0 ? h.precio_base : precioTipo,
      }
    })
    setHabitaciones(conTipo)
    setLoading(false)
    await aplicarTransicionesAutomaticas(conTipo)
  }

  // Pasa habitaciones "ocupado" con fecha de salida vencida a "confirmar_salida"
  async function aplicarTransicionesAutomaticas(habs) {
    const hoy = new Date().toISOString().split('T')[0]
    const vencidas = habs.filter(h => h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy)
    for (const h of vencidas) {
      const { error } = await supabase.from('habitaciones').update({ estado: 'confirmar_salida' }).eq('id', h.id)
      if (error) console.error('Error en transición automática de hab.', h.numero, error)
    }
    if (vencidas.length > 0) {
      setHabitaciones(prev => prev.map(h =>
        vencidas.some(v => v.id === h.id) ? { ...h, estado: 'confirmar_salida' } : h
      ))
    }
  }

  async function handleSave(form) {
    // Calcula si el pago cubre exactamente el total, para mostrar uno o dos tics
    const precioDesayuno = loadSettings().precioDesayuno
    const desayunosBruto = (form.desayunos || 0) * precioDesayuno
    const desayunosAplicado = form.no_cobrar_desayuno ? 0 : desayunosBruto
    const baseTotal = (form.precio_base || 0) + desayunosAplicado
    const ivaAplicado = form.no_cobrar_iva ? 0 : baseTotal * 0.19
    const total = Math.round(baseTotal + ivaAplicado)
    const saldoPendiente = form.estado_pago === 'pagado' ? (total !== (form.monto_pagado || 0)) : false

    const payload = { ...form, saldo_pendiente_pago: saldoPendiente }
    // El tipo se calcula en el frontend desde Configuración, no se guarda en la fila
    delete payload.tipo
    // Ya no se guarda por habitación, vive en Configuración (localStorage)
    delete payload.precio_desayuno

    const { error } = await supabase.from('habitaciones').update(payload).eq('id', form.id)
    if (error) {
      alert('No se pudo guardar: ' + error.message)
      console.error('Error al guardar habitación:', error)
      return
    }
    setSelected(null)
    fetchHabitaciones()
  }

  async function handleConfirmSalida(hab) {
    const { error } = await supabase.from('habitaciones').update({
      estado: 'libre',
      fecha_inicio: null,
      fecha_fin: null,
      desayunos: 0,
      no_cobrar_desayuno: false,
      no_cobrar_iva: false,
      estado_pago: 'no_abonado',
      abono: 0,
      monto_pagado: 0,
      saldo_pendiente_pago: false,
    }).eq('id', hab.id)
    if (error) {
      alert('No se pudo confirmar la salida: ' + error.message)
      console.error('Error al confirmar salida:', error)
      return
    }
    fetchHabitaciones()
  }

  const pendingCount = habitaciones.filter(h => {
    const hoy = new Date().toISOString().split('T')[0]
    return h.estado === 'reservado' || h.estado === 'confirmar_salida' || (h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy)
  }).length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400 tracking-wide">Cargando habitaciones...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">Hotel Manager</h1>
        <button onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          title="Configuración">
          <GearIcon />
        </button>
      </header>

      {/* ── Layout ── */}
      <div className="flex">

        {/* ── Grid principal ── */}
        <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6">
          <div className="flex items-center gap-5 mb-4 flex-wrap">
            {[
              ['bg-emerald-400', 'Libre'],
              ['bg-amber-400', 'Reservado'],
              ['bg-red-600', 'Ocupado'],
              ['bg-purple-500', 'Confirmar salida'],
            ].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
                <span className="text-xs text-gray-400">{l}</span>
              </div>
            ))}
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, 152px)' }}
          >
            {habitaciones.map(hab => (
              <RoomCard
                key={hab.id}
                hab={hab}
                onClick={() => setSelected(hab)}
                onConfirmSalida={handleConfirmSalida}
              />
            ))}
          </div>
        </main>

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:block w-64 shrink-0 border-l border-gray-100 bg-white p-5 min-h-[calc(100vh-53px)]">
          <SiguientePanel
            habitaciones={habitaciones}
            onSelectHab={h => setSelected(h)}
          />
        </aside>
      </div>

      {/* ── Tab inferior móvil ── */}
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
            <SiguientePanel
              habitaciones={habitaciones}
              onSelectHab={h => { setSelected(h); setShowSiguiente(false) }}
            />
          </div>
        )}
      </div>

      {/* ── Modales ── */}
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
