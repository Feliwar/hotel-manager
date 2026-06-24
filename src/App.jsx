import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const TIPOS = ['Individual', 'Doble', 'Matrimonial', 'Triple', 'Matrimonial+1']

const estadoColor = {
  libre: 'bg-green-500',
  reservado: 'bg-orange-400',
  ocupado: 'bg-red-500',
}

const estadoLabel = {
  libre: 'Libre',
  reservado: 'Reservado',
  ocupado: 'Ocupado',
}

function Modal({ hab, onClose, onSave }) {
  const [form, setForm] = useState({ ...hab })

  const precioDesayunoTotal = (form.desayunos || 0) * (form.precio_desayuno || 0)
  const baseTotal = (form.precio_base || 0) + precioDesayunoTotal
  const iva = baseTotal * 0.19
  const total = baseTotal + iva

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'estado' && value === 'libre') {
        updated.fecha_inicio = null
        updated.fecha_fin = null
      }
      return updated
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-screen">
        <h2 className="text-xl font-bold mb-5 text-center">Habitación {hab.numero}</h2>

        {/* Tipo */}
        <label className="block mb-1 text-sm text-gray-400">Tipo de habitación</label>
        <select
          className="w-full bg-gray-800 rounded-lg p-2 mb-4 text-white"
          value={form.tipo}
          onChange={e => handleChange('tipo', e.target.value)}>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Estado */}
        <label className="block mb-1 text-sm text-gray-400">Estado</label>
        <select
          className="w-full bg-gray-800 rounded-lg p-2 mb-4 text-white"
          value={form.estado}
          onChange={e => handleChange('estado', e.target.value)}>
          <option value="libre">🟢 Libre</option>
          <option value="reservado">🟠 Reservado</option>
          <option value="ocupado">🔴 Ocupado</option>
        </select>

        {/* Fechas — solo si no está libre */}
        {form.estado !== 'libre' && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <label className="block mb-1 text-sm text-gray-400">Fecha entrada</label>
            <input
              type="date"
              className="w-full bg-gray-700 rounded-lg p-2 mb-3 text-white"
              value={form.fecha_inicio || ''}
              onChange={e => handleChange('fecha_inicio', e.target.value)} />
            <label className="block mb-1 text-sm text-gray-400">Fecha salida</label>
            <input
              type="date"
              className="w-full bg-gray-700 rounded-lg p-2 text-white"
              value={form.fecha_fin || ''}
              onChange={e => handleChange('fecha_fin', e.target.value)} />
          </div>
        )}

        {/* Precio base */}
        <label className="block mb-1 text-sm text-gray-400">Precio base ($)</label>
        <input
          type="number"
          className="w-full bg-gray-800 rounded-lg p-2 mb-4 text-white"
          value={form.precio_base || ''}
          placeholder="0"
          onChange={e => handleChange('precio_base', parseFloat(e.target.value) || 0)} />

        {/* Desayunos */}
        <label className="block mb-1 text-sm text-gray-400">Desayunos</label>
        <select
          className="w-full bg-gray-800 rounded-lg p-2 mb-4 text-white"
          value={form.desayunos || 0}
          onChange={e => handleChange('desayunos', parseInt(e.target.value))}>
          <option value={0}>Sin desayuno</option>
          <option value={1}>1 desayuno</option>
          <option value={2}>2 desayunos</option>
          <option value={3}>3 desayunos</option>
          <option value={4}>4 desayunos</option>
        </select>

        {/* Precio por desayuno */}
        {(form.desayunos || 0) > 0 && (
          <>
            <label className="block mb-1 text-sm text-gray-400">Precio por desayuno ($)</label>
            <input
              type="number"
              className="w-full bg-gray-800 rounded-lg p-2 mb-4 text-white"
              value={form.precio_desayuno || ''}
              placeholder="0"
              onChange={e => handleChange('precio_desayuno', parseFloat(e.target.value) || 0)} />
          </>
        )}

        {/* Resumen IVA */}
        <div className="bg-gray-800 rounded-lg p-4 mb-5 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Habitación</span>
            <span>${(form.precio_base || 0).toLocaleString('es-CL')}</span>
          </div>
          {(form.desayunos || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Desayunos ({form.desayunos})</span>
              <span>${precioDesayunoTotal.toLocaleString('es-CL')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Subtotal</span>
            <span>${baseTotal.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">IVA (19%)</span>
            <span>${Math.round(iva).toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between font-bold text-green-400 border-t border-gray-700 pt-2">
            <span>Total</span>
            <span>${Math.round(total).toLocaleString('es-CL')}</span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 transition"
            onClick={onClose}>
            Cancelar
          </button>
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-lg py-2 font-semibold transition"
            onClick={() => onSave(form)}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [habitaciones, setHabitaciones] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHabitaciones()

    const channel = supabase
      .channel('habitaciones-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'habitaciones'
      }, payload => {
        setHabitaciones(prev =>
          prev.map(h => h.id === payload.new.id ? payload.new : h)
        )
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchHabitaciones() {
    const { data } = await supabase
      .from('habitaciones')
      .select('*')
      .order('numero')
    setHabitaciones(data || [])
    setLoading(false)
  }

  async function handleSave(form) {
    await supabase
      .from('habitaciones')
      .update(form)
      .eq('id', form.id)
    setSelected(null)
    fetchHabitaciones()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-xl">
      Cargando habitaciones...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold text-center mb-8 tracking-wide">
        🏨 Gestión de Habitaciones
      </h1>

      <div className="grid grid-cols-5 gap-4 max-w-3xl mx-auto">
        {habitaciones.map(hab => (
          <div
            key={hab.id}
            onClick={() => setSelected(hab)}
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3 flex flex-col items-center cursor-pointer transition select-none">

            {/* Número */}
            <span className="text-lg font-bold">{hab.numero}</span>

            {/* Círculo de estado */}
            <span className={`w-4 h-4 rounded-full mt-2 ${estadoColor[hab.estado]}`} />

            {/* Fecha si no está libre */}
            {hab.estado !== 'libre' ? (
              <span className="text-xs text-gray-400 mt-1 text-center leading-tight">
                {hab.fecha_inicio || '—'}
              </span>
            ) : (
              <span className="text-xs text-transparent mt-1">—</span>
            )}

            {/* Tipo */}
            <span className="text-xs text-gray-500 mt-1 text-center">{hab.tipo}</span>

            {/* Precio */}
            <span className="text-xs text-gray-400">
              ${(hab.precio_base || 0).toLocaleString('es-CL')}
            </span>

            {/* Desayunos */}
            <span className="text-xs mt-1 text-yellow-400 text-center">
              {(hab.desayunos || 0) === 0
                ? 'Sin desayuno'
                : `${hab.desayunos} desayuno${hab.desayunos > 1 ? 's' : ''}`}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <Modal
          hab={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}