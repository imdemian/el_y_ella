import React, { useState } from "react";
import { toast } from "react-toastify";
import { AuthService } from "../../services/supabase/authService";
import { UsuariosService } from "../../services/supabase/usuariosService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faUser,
  faUserTag,
} from "@fortawesome/free-solid-svg-icons";
import "./Registro.Usuario.scss";

export default function RegistroUsuario({ usuario, setShow, refetch }) {
  const isEdit = !!usuario;

  const [form, setForm] = useState({
    email: usuario?.email || "",
    password: "",
    nombre: usuario?.nombre || "",
    apellido: usuario?.apellido || "",
    rol: usuario?.rol || "user",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        // EDITAR USUARIO
        const updateData = {
          nombre: form.nombre,
          rol: form.rol,
        };

        if (form.empleadoId) {
          updateData.empleadoId = form.empleadoId;
        }

        await UsuariosService.actualizarUsuario(usuario.id, updateData);

        // Si se ingresó nueva contraseña, actualizarla
        if (form.password) {
          await UsuariosService.changePassword(usuario.id, {
            nuevaPassword: form.password,
          });
        }

        toast.success("✅ Usuario actualizado correctamente");
      } else {
        // CREAR USUARIO
        const userData = {
          email: form.email,
          password: form.password,
          nombre: form.nombre,
          apellido: form.apellido,
          rol: form.rol,
        };

        if (form.empleadoId) {
          userData.empleadoId = form.empleadoId;
        }

        await AuthService.register(userData);
        toast.success("✅ Usuario registrado correctamente");
      }

      setShow(false);
      if (refetch) refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-usuario-form">
      <div className="form-header">
        <h3>{isEdit ? "Editar Usuario" : "Registrar Nuevo Usuario"}</h3>
        <p className="form-subtitle">
          {isEdit
            ? "Actualiza la información del usuario"
            : "Completa los datos para crear un nuevo usuario"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            <FontAwesomeIcon icon={faEnvelope} /> Correo Electrónico
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="ejemplo@correo.com"
            value={form.email}
            onChange={handleChange}
            required
            className="form-input"
            disabled={isEdit}
          />
          {isEdit && (
            <small className="form-hint">El correo no se puede modificar</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            <FontAwesomeIcon icon={faLock} />{" "}
            {isEdit ? "Nueva Contraseña" : "Contraseña"}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder={
              isEdit ? "Dejar en blanco para mantener actual" : "••••••••"
            }
            value={form.password}
            onChange={handleChange}
            className="form-input"
            required={!isEdit}
            minLength={6}
          />
          {isEdit && (
            <small className="form-hint">
              Deja este campo vacío si no deseas cambiar la contraseña
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="nombre" className="form-label">
            <FontAwesomeIcon icon={faUser} /> Nombre
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder="Nombre completo del usuario"
            value={form.nombre}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="apellido" className="form-label">
            <FontAwesomeIcon icon={faUser} /> Apellido
          </label>
          <input
            type="text"
            id="apellido"
            name="apellido"
            placeholder="Apellido del usuario"
            value={form.apellido}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="rol" className="form-label">
            <FontAwesomeIcon icon={faUserTag} /> Rol del Usuario
          </label>
          <select
            id="rol"
            name="rol"
            value={form.rol}
            onChange={handleChange}
            className="form-select"
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
            <option value="manager">Gerente</option>
            <option value="tecnico">Técnico</option>
          </select>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShow(false)}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                {isEdit ? "Actualizando..." : "Registrando..."}
              </>
            ) : (
              <>{isEdit ? "Actualizar Usuario" : "Registrar Usuario"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
