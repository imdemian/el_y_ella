// src/services/imageService.js
import { supabase } from "../supabase/supabaseConfig";

/**
 * Servicio para manejo de imágenes con Supabase Storage
 */
export class ImageService {
  static bucketName = "productos";

  /**
   * Redimensiona una imagen en el cliente para crear thumbnail
   * @param {File} file - Archivo de imagen
   * @param {number} maxWidth - Ancho máximo del thumbnail
   * @param {number} maxHeight - Alto máximo del thumbnail
   * @returns {Promise<Blob>} - Blob de la imagen redimensionada
   */
  static async createThumbnail(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Error al crear thumbnail"));
              }
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Error al cargar imagen"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Error al leer archivo"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Valida que el archivo sea una imagen válida
   * @param {File} file - Archivo a validar
   * @returns {boolean} - true si es válido
   */
  static validateImage(file) {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      throw new Error("Formato de imagen no válido. Usa JPG, PNG o WEBP.");
    }

    if (file.size > maxSize) {
      throw new Error("La imagen es muy grande. Máximo 5MB.");
    }

    return true;
  }

  /**
   * Solicita una signed URL al backend para subir imagen
   * @param {string} path - Ruta en Storage
   * @returns {Promise<{uploadUrl: string, publicUrl: string}>}
   */
  static async getSignedUploadUrl(path) {
    const token = localStorage.getItem("auth_token");
    const API_URL =
      "http://localhost:5001/elyella-d411f/us-central1/api/supabase";

    const response = await fetch(`${API_URL}/storage/signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al obtener URL firmada");
    }

    return response.json();
  }

  /**
   * Sube una imagen y su thumbnail a Supabase Storage usando signed URLs
   * @param {File} file - Archivo de imagen
   * @param {string} path - Ruta en Storage (ej: productos/abc123/principal)
   * @returns {Promise<{original: string, thumbnail: string}>} - URLs de las imágenes
   */
  static async uploadImage(file, path) {
    try {
      // Validar imagen
      this.validateImage(file);

      // Crear thumbnail
      const thumbnailBlob = await this.createThumbnail(file);

      // Generar nombres únicos
      const timestamp = Date.now();
      const originalPath = `${path}_${timestamp}.jpg`;
      const thumbnailPath = `${path}_${timestamp}_thumb.jpg`;

      // Obtener signed URLs del backend
      const [originalSigned, thumbnailSigned] = await Promise.all([
        this.getSignedUploadUrl(originalPath),
        this.getSignedUploadUrl(thumbnailPath),
      ]);

      // Subir imagen original usando signed URL
      const uploadOriginal = await fetch(originalSigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "x-upsert": "true",
        },
      });

      if (!uploadOriginal.ok) {
        throw new Error("Error al subir imagen original");
      }

      // Subir thumbnail usando signed URL
      const uploadThumbnail = await fetch(thumbnailSigned.uploadUrl, {
        method: "PUT",
        body: thumbnailBlob,
        headers: {
          "Content-Type": "image/jpeg",
          "x-upsert": "true",
        },
      });

      if (!uploadThumbnail.ok) {
        throw new Error("Error al subir thumbnail");
      }

      // Retornar las URLs públicas que ya vienen del backend
      return {
        original: originalSigned.publicUrl,
        thumbnail: thumbnailSigned.publicUrl,
      };
    } catch (error) {
      console.error("Error al subir imagen:", error);
      throw error;
    }
  }

  /**
   * Sanitiza el nombre del producto para usarlo en rutas de archivos
   * @param {string} nombre - Nombre del producto
   * @returns {string} Nombre sanitizado
   */
  static sanitizeFileName(nombre) {
    return nombre
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Reemplazar caracteres especiales con guiones
      .replace(/^-+|-+$/g, "") // Eliminar guiones al inicio y final
      .substring(0, 50); // Limitar longitud
  }

  /**
   * Sube imagen principal de un producto
   * @param {string} productoId - ID del producto
   * @param {string} nombreProducto - Nombre del producto
   * @param {File} file - Archivo de imagen
   * @returns {Promise<{original: string, thumbnail: string}>}
   */
  static async uploadProductoImagen(productoId, nombreProducto, file) {
    const nombreSanitizado = this.sanitizeFileName(nombreProducto);
    const carpeta = `${productoId}_${nombreSanitizado}`;
    const path = `productos/${carpeta}/principal`;
    return this.uploadImage(file, path);
  }

  /**
   * Sube imagen de una variante
   * @param {string} productoId - ID del producto
   * @param {string} nombreProducto - Nombre del producto
   * @param {string} varianteId - ID de la variante
   * @param {File} file - Archivo de imagen
   * @param {number} index - Índice de la imagen (para múltiples fotos)
   * @returns {Promise<{original: string, thumbnail: string}>}
   */
  static async uploadVarianteImagen(
    productoId,
    nombreProducto,
    varianteId,
    file,
    index = 0
  ) {
    const nombreSanitizado = this.sanitizeFileName(nombreProducto);
    const carpeta = `${productoId}_${nombreSanitizado}`;
    const path = `productos/${carpeta}/variantes/${varianteId}_${index}`;
    return this.uploadImage(file, path);
  }

  /**
   * Elimina una imagen de Supabase Storage
   * @param {string} url - URL de la imagen a eliminar
   * @returns {Promise<void>}
   */
  static async deleteImage(url) {
    try {
      if (!url) return;

      // Extraer el path de la URL pública de Supabase
      // URL format: https://[project].supabase.co/storage/v1/object/public/productos/path/to/file.jpg
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(
        `/object/public/${this.bucketName}/`
      );

      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        const { error } = await supabase.storage
          .from(this.bucketName)
          .remove([filePath]);

        if (error) {
          console.error("Error al eliminar imagen:", error);
        }
      }
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      // No lanzar error si la imagen no existe
    }
  }

  /**
   * Elimina imagen y su thumbnail
   * @param {string} originalUrl - URL de la imagen original
   * @param {string} thumbnailUrl - URL del thumbnail
   * @returns {Promise<void>}
   */
  static async deleteImageWithThumbnail(originalUrl, thumbnailUrl) {
    await Promise.all([
      this.deleteImage(originalUrl),
      this.deleteImage(thumbnailUrl),
    ]);
  }
  /**
   * Elimina todas las imágenes de un producto
   * @param {string} productoId - ID del producto
   * @param {string} nombreProducto - Nombre del producto
   * @returns {Promise<void>}
   */
  static async deleteProductoImages(productoId, nombreProducto) {
    try {
      const nombreSanitizado = this.sanitizeFileName(nombreProducto);
      const carpeta = `${productoId}_${nombreSanitizado}`;

      // Listar todos los archivos en la carpeta del producto
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list(`productos/${carpeta}`, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error("Error al listar imágenes:", error);
        return;
      }

      if (files && files.length > 0) {
        // Crear array de paths para eliminar
        const filePaths = files.map(
          (file) => `productos/${carpeta}/${file.name}`
        );

        const { error: deleteError } = await supabase.storage
          .from(this.bucketName)
          .remove(filePaths);

        if (deleteError) {
          console.error("Error al eliminar imágenes:", deleteError);
        } else {
          console.log(
            `✅ ${files.length} imágenes eliminadas del producto ${productoId}`
          );
        }
      }
    } catch (error) {
      console.error("Error al eliminar imágenes del producto:", error);
    }
  }
}
