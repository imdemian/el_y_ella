import { supabase } from "../supabase/supabaseConfig";

/**
 * Servicio para manejo de imágenes con Supabase Storage
 */
export class ImageService {
  // ✅ CORREGIDO: Nombre exacto del bucket en mayúsculas
  static bucketName = "PRODUCTOS";

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
   * Sube una imagen y su thumbnail directamente a Supabase Storage
   * @param {File} file - Archivo de imagen
   * @param {string} path - Ruta en Storage (ej: productos/abc123/principal)
   * @returns {Promise<{original: string, thumbnail: string}>} - URLs de las imágenes
   */
  static async uploadImage(file, path) {
    try {
      // Validar imagen
      this.validateImage(file);

      console.log("📤 Subiendo imagen:", {
        path,
        fileName: file.name,
        size: file.size,
        bucket: this.bucketName,
      });

      // Crear thumbnail
      const thumbnailBlob = await this.createThumbnail(file);

      // Generar nombres únicos con timestamp
      const timestamp = Date.now();
      const originalPath = `${path}_${timestamp}.jpg`;
      const thumbnailPath = `${path}_${timestamp}_thumb.jpg`;

      console.log("📁 Rutas generadas:", { originalPath, thumbnailPath });

      // Subir imagen original a Supabase Storage
      const { data: _originalData, error: originalError } =
        await supabase.storage
          .from(this.bucketName)
          .upload(originalPath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type,
          });

      if (originalError) {
        console.error("❌ Error al subir imagen original:", originalError);
        throw new Error(`Error al subir imagen: ${originalError.message}`);
      }

      // Subir thumbnail a Supabase Storage
      const { data: _thumbnailData, error: thumbnailError } =
        await supabase.storage
          .from(this.bucketName)
          .upload(thumbnailPath, thumbnailBlob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/jpeg",
          });

      if (thumbnailError) {
        // Si falla el thumbnail, intentamos borrar la original para no dejar basura
        await supabase.storage.from(this.bucketName).remove([originalPath]);
        console.error("❌ Error al subir thumbnail:", thumbnailError);
        throw new Error(`Error al subir thumbnail: ${thumbnailError.message}`);
      }

      // Obtener URLs públicas
      const { data: originalUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(originalPath);

      const { data: thumbnailUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(thumbnailPath);

      const urls = {
        original: originalUrlData.publicUrl,
        thumbnail: thumbnailUrlData.publicUrl,
      };

      console.log("🔗 URLs generadas:", urls);

      return urls;
    } catch (error) {
      console.error("❌ Error al subir imagen:", error);
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
    // Nota: 'productos' aquí es el nombre de la carpeta DENTRO del bucket, no el bucket en sí.
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

      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(
        `/object/public/${this.bucketName}/`
      );

      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1]);

        const { error } = await supabase.storage
          .from(this.bucketName)
          .remove([filePath]);

        if (error) {
          console.error("Error al eliminar imagen de storage:", error);
        } else {
          console.log("Imagen eliminada correctamente:", filePath);
        }
      }
    } catch (error) {
      console.error("Error al procesar eliminación de imagen:", error);
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
   * Elimina todas las imágenes de un producto (carpeta completa)
   * @param {string} productoId - ID del producto
   * @param {string} nombreProducto - Nombre del producto
   * @returns {Promise<void>}
   */
  static async deleteProductoImages(productoId, nombreProducto) {
    try {
      const nombreSanitizado = this.sanitizeFileName(nombreProducto);
      const carpeta = `${productoId}_${nombreSanitizado}`;

      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list(`productos/${carpeta}`, { limit: 100 });

      if (error) {
        console.error("Error al listar imágenes:", error);
        return;
      }

      const { data: variantFiles, error: _variantError } =
        await supabase.storage
          .from(this.bucketName)
          .list(`productos/${carpeta}/variantes`, { limit: 100 });

      let allFilesToRemove = [];

      if (files && files.length > 0) {
        allFilesToRemove = [
          ...allFilesToRemove,
          ...files.map((f) => `productos/${carpeta}/${f.name}`),
        ];
      }

      if (variantFiles && variantFiles.length > 0) {
        allFilesToRemove = [
          ...allFilesToRemove,
          ...variantFiles.map(
            (f) => `productos/${carpeta}/variantes/${f.name}`
          ),
        ];
      }

      if (allFilesToRemove.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from(this.bucketName)
          .remove(allFilesToRemove);

        if (deleteError) {
          console.error("Error al eliminar imágenes:", deleteError);
        } else {
          console.log(`✅ ${allFilesToRemove.length} imágenes eliminadas.`);
        }
      }
    } catch (error) {
      console.error("Error al eliminar imágenes del producto:", error);
    }
  }
}
