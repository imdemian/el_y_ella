// src/pages/Productos/RegistrarProductos.jsx
import React, { useEffect, useState } from "react";
import { ProductoService } from "../../services/supabase/productoService";
import { CategoriaService } from "../../services/supabase/categoriaService";
import { VarianteService } from "../../services/supabase/varianteService";
import { ImageService } from "../../services/imageService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faFileAlt,
  faLayerGroup,
  faDollarSign,
  faSpinner,
  faCog,
  faTrash,
  faBarcode,
  faTags,
  faMagic,
  faCheck,
  faImage,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import "./RegistrarProductos.scss";

// Catálogo de tallas y colores predefinidos
const TALLAS_DISPONIBLES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORES_DISPONIBLES = [
  "Negro",
  "Blanco",
  "Azul",
  "Rojo",
  "Verde",
  "Amarillo",
  "Rosa",
  "Gris",
  "Café",
  "Morado",
];

const RegistroProducto = ({ producto, setShow, refetch }) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [marca, setMarca] = useState("");
  const [loading, setLoading] = useState(false);
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState([]);
  const [coloresSeleccionados, setColoresSeleccionados] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [costoVariante, setCostoVariante] = useState("");
  const [aplicarPrecioVariantes, setAplicarPrecioVariantes] = useState(false);
  const [codigoUnicoProducto, setCodigoUnicoProducto] = useState("");

  // Estados para tallas y colores personalizados
  const [tallasPersonalizadas, setTallasPersonalizadas] = useState([]);
  const [coloresPersonalizados, setColoresPersonalizados] = useState([]);
  const [inputTallaPersonalizada, setInputTallaPersonalizada] = useState("");
  const [inputColorPersonalizado, setInputColorPersonalizado] = useState("");

  // Estados para atributo personalizado (diseño, aroma, sabor, etc.)
  const [nombreAtributoPersonalizado, setNombreAtributoPersonalizado] =
    useState("Diseño");
  const [atributosPersonalizados, setAtributosPersonalizados] = useState([]);
  const [atributosSeleccionados, setAtributosSeleccionados] = useState([]);
  const [inputAtributoPersonalizado, setInputAtributoPersonalizado] =
    useState("");

  // Estados para imágenes
  const [imagenPrincipal, setImagenPrincipal] = useState(null); // File object
  const [imagenPrincipalPreview, setImagenPrincipalPreview] = useState(""); // URL preview
  const [imagenPrincipalUrl, setImagenPrincipalUrl] = useState(""); // URL guardada en Firestore
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [imagenesVariantes, setImagenesVariantes] = useState({}); // { varianteId: { file, preview, url } }

  // Función para generar código único alfanumérico
  const generarCodigoUnico = () => {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin 0, O, I, 1 para evitar confusión
    let codigo = "";
    for (let i = 0; i < 4; i++) {
      codigo += caracteres.charAt(
        Math.floor(Math.random() * caracteres.length)
      );
    }
    return codigo;
  };

  useEffect(() => {
    let mounted = true;
    const cargarDatos = async () => {
      try {
        const categoriasData = await CategoriaService.obtenerCategorias();
        if (mounted) {
          setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        }
        if (producto) {
          setNombre(producto.nombre || "");
          setDescripcion(producto.descripcion || "");
          setCategoriaId(producto.categoria_id || "");
          setPrecioBase(
            producto.precio_base != null ? String(producto.precio_base) : ""
          );
          setMarca(producto.marca || "");
          // Usar ID del producto existente o generar código
          setCodigoUnicoProducto(
            producto.id ? String(producto.id) : generarCodigoUnico()
          );

          // Cargar imagen existente
          if (producto.imagen_thumbnail_url || producto.imagen_url) {
            setImagenPrincipalUrl(
              producto.imagen_thumbnail_url || producto.imagen_url
            );
          }

          // Cargar variantes existentes si está en modo edición
          if (
            producto.variantes_producto &&
            producto.variantes_producto.length > 0
          ) {
            const tallasExistentes = new Set();
            const coloresExistentes = new Set();

            const variantesCargadas = producto.variantes_producto.map(
              (v, index) => ({
                id: v.id || "loaded-" + index,
                sku: v.sku,
                atributos: v.atributos || {},
                precio: String(v.precio || producto.precio_base || ""),
                costo: v.costo ? String(v.costo) : "",
                activo: v.activo !== false,
              })
            );

            // Cargar imágenes de variantes existentes
            const imagenesVariantesMap = {};
            producto.variantes_producto.forEach((v) => {
              // Extraer tallas y colores únicos
              if (v.atributos?.talla) {
                tallasExistentes.add(v.atributos.talla);
              }
              if (v.atributos?.color) {
                coloresExistentes.add(v.atributos.color);
              }

              // Cargar imagen si existe
              if (v.imagen_thumbnail_url || v.imagen_url) {
                const varianteId =
                  v.id || "loaded-" + producto.variantes_producto.indexOf(v);
                imagenesVariantesMap[varianteId] = {
                  file: null,
                  preview: null,
                  url: v.imagen_thumbnail_url || v.imagen_url,
                };
              }
            });

            setVariantes(variantesCargadas);
            setTallasSeleccionadas(Array.from(tallasExistentes));
            setColoresSeleccionados(Array.from(coloresExistentes));
            setImagenesVariantes(imagenesVariantesMap);
          }
        } else {
          // Producto nuevo: generar código único
          if (!codigoUnicoProducto) {
            setCodigoUnicoProducto(generarCodigoUnico());
          }
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar datos iniciales");
      }
    };
    cargarDatos();
    return () => {
      mounted = false;
    };
  }, [producto, codigoUnicoProducto]);

  const generarVariantes = () => {
    if (
      tallasSeleccionadas.length === 0 &&
      coloresSeleccionados.length === 0 &&
      atributosSeleccionados.length === 0
    ) {
      toast.warning(
        "Selecciona al menos una talla, color o " +
          nombreAtributoPersonalizado.toLowerCase()
      );
      return;
    }
    if (!precioBase || parseFloat(precioBase) <= 0) {
      toast.error("Ingresa un precio base válido primero");
      return;
    }
    const nuevasVariantes = [];

    // Generar prefijo: si hay varias palabras, tomar primera letra de cada una
    // Si es una sola palabra, tomar las primeras 3 letras
    let prefijo = "PRO";
    if (nombre) {
      const palabras = nombre.trim().split(/\s+/); // Dividir por espacios
      if (palabras.length > 1) {
        // Varias palabras: primera letra de cada una
        prefijo = palabras
          .map((p) => p.charAt(0))
          .join("")
          .toUpperCase();
      } else {
        // Una sola palabra: primeras 3 letras
        prefijo = nombre.substring(0, 3).toUpperCase();
      }
    }

    const codigo = codigoUnicoProducto || generarCodigoUnico();

    // Guardar el código si es nuevo
    if (!codigoUnicoProducto) {
      setCodigoUnicoProducto(codigo);
    }

    // Caso: Solo atributo personalizado
    if (
      atributosSeleccionados.length > 0 &&
      tallasSeleccionadas.length === 0 &&
      coloresSeleccionados.length === 0
    ) {
      atributosSeleccionados.forEach((atributo, index) => {
        const claveAtributo = nombreAtributoPersonalizado
          .toLowerCase()
          .replace(/\s+/g, "_");
        nuevasVariantes.push({
          id: "temp-" + Date.now() + "-" + index,
          sku: `${prefijo}-${codigo}-${atributo.substring(0, 4).toUpperCase()}`,
          atributos: { [claveAtributo]: atributo },
          precio: precioBase,
          costo: costoVariante || "",
          activo: true,
        });
      });
    } else if (
      tallasSeleccionadas.length > 0 &&
      coloresSeleccionados.length === 0 &&
      atributosSeleccionados.length === 0
    ) {
      tallasSeleccionadas.forEach((talla, index) => {
        nuevasVariantes.push({
          id: "temp-" + Date.now() + "-" + index,
          sku: `${prefijo}-${codigo}-${talla.toUpperCase()}`,
          atributos: { talla: talla },
          precio: precioBase,
          costo: costoVariante || "",
          activo: true,
        });
      });
    } else if (
      coloresSeleccionados.length > 0 &&
      tallasSeleccionadas.length === 0 &&
      atributosSeleccionados.length === 0
    ) {
      coloresSeleccionados.forEach((color, index) => {
        nuevasVariantes.push({
          id: "temp-" + Date.now() + "-" + index,
          sku: `${prefijo}-${codigo}-${color.substring(0, 2).toUpperCase()}`,
          atributos: { color: color },
          precio: precioBase,
          costo: costoVariante || "",
          activo: true,
        });
      });
    } else {
      // Combinaciones con múltiples atributos
      const claveAtributo = nombreAtributoPersonalizado
        .toLowerCase()
        .replace(/\s+/g, "_");
      const usarTallas = tallasSeleccionadas.length > 0;
      const usarColores = coloresSeleccionados.length > 0;
      const usarAtributos = atributosSeleccionados.length > 0;

      const tallas = usarTallas ? tallasSeleccionadas : [""];
      const colores = usarColores ? coloresSeleccionados : [""];
      const atributos = usarAtributos ? atributosSeleccionados : [""];

      tallas.forEach((talla) => {
        colores.forEach((color) => {
          atributos.forEach((atributo) => {
            // Construir SKU dinámicamente
            let skuParts = [prefijo, codigo];
            let atributosObj = {};
            let idParts = [Date.now()];

            if (talla) {
              skuParts.push(talla.toUpperCase());
              atributosObj.talla = talla;
              idParts.push(talla);
            }
            if (color) {
              skuParts.push(color.substring(0, 2).toUpperCase());
              atributosObj.color = color;
              idParts.push(color);
            }
            if (atributo) {
              skuParts.push(atributo.substring(0, 4).toUpperCase());
              atributosObj[claveAtributo] = atributo;
              idParts.push(atributo);
            }

            nuevasVariantes.push({
              id: `temp-${idParts.join("-")}`,
              sku: skuParts.join("-"),
              atributos: atributosObj,
              precio: precioBase,
              costo: costoVariante || "",
              activo: true,
            });
          });
        });
      });
    }
    setVariantes(nuevasVariantes);
    toast.success(
      "✨ " + nuevasVariantes.length + " variantes generadas automáticamente"
    );
  };

  const toggleTalla = (talla) => {
    setTallasSeleccionadas((prev) => {
      const existe = prev.includes(talla);
      return existe ? prev.filter((t) => t !== talla) : [...prev, talla];
    });
  };

  const toggleColor = (color) => {
    setColoresSeleccionados((prev) => {
      const existe = prev.includes(color);
      return existe ? prev.filter((c) => c !== color) : [...prev, color];
    });
  };

  const agregarTallaPersonalizada = () => {
    const talla = inputTallaPersonalizada.trim().toUpperCase();
    if (!talla) {
      toast.warning("Ingresa una talla");
      return;
    }
    if (
      TALLAS_DISPONIBLES.includes(talla) ||
      tallasPersonalizadas.includes(talla)
    ) {
      toast.warning("Esta talla ya existe");
      return;
    }
    setTallasPersonalizadas([...tallasPersonalizadas, talla]);
    setTallasSeleccionadas([...tallasSeleccionadas, talla]);
    setInputTallaPersonalizada("");
    toast.success(`Talla "${talla}" agregada`);
  };

  const agregarColorPersonalizado = () => {
    const color = inputColorPersonalizado.trim();
    if (!color) {
      toast.warning("Ingresa un color");
      return;
    }
    if (
      COLORES_DISPONIBLES.includes(color) ||
      coloresPersonalizados.includes(color)
    ) {
      toast.warning("Este color ya existe");
      return;
    }
    setColoresPersonalizados([...coloresPersonalizados, color]);
    setColoresSeleccionados([...coloresSeleccionados, color]);
    setInputColorPersonalizado("");
    toast.success(`Color "${color}" agregado`);
  };

  const eliminarTallaPersonalizada = (talla) => {
    setTallasPersonalizadas(tallasPersonalizadas.filter((t) => t !== talla));
    setTallasSeleccionadas(tallasSeleccionadas.filter((t) => t !== talla));
  };

  const eliminarColorPersonalizado = (color) => {
    setColoresPersonalizados(coloresPersonalizados.filter((c) => c !== color));
    setColoresSeleccionados(coloresSeleccionados.filter((c) => c !== color));
  };

  const agregarAtributoPersonalizado = () => {
    const atributo = inputAtributoPersonalizado.trim();
    if (!atributo) {
      toast.warning("Ingresa un valor para " + nombreAtributoPersonalizado);
      return;
    }
    if (atributosPersonalizados.includes(atributo)) {
      toast.warning("Este valor ya existe");
      return;
    }
    setAtributosPersonalizados([...atributosPersonalizados, atributo]);
    setAtributosSeleccionados([...atributosSeleccionados, atributo]);
    setInputAtributoPersonalizado("");
    toast.success(`${nombreAtributoPersonalizado} "${atributo}" agregado`);
  };

  const toggleAtributoPersonalizado = (atributo) => {
    setAtributosSeleccionados((prev) => {
      const existe = prev.includes(atributo);
      return existe ? prev.filter((a) => a !== atributo) : [...prev, atributo];
    });
  };

  const eliminarAtributoPersonalizado = (atributo) => {
    setAtributosPersonalizados(
      atributosPersonalizados.filter((a) => a !== atributo)
    );
    setAtributosSeleccionados(
      atributosSeleccionados.filter((a) => a !== atributo)
    );
  };

  const actualizarVariante = (index, campo, valor) => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index][campo] = valor;
    setVariantes(nuevasVariantes);
  };

  const eliminarTodasVariantes = () => {
    if (window.confirm("¿Estás seguro de eliminar todas las variantes?")) {
      setVariantes([]);
      setTallasSeleccionadas([]);
      setColoresSeleccionados([]);
      setAtributosSeleccionados([]);
      toast.info("Variantes eliminadas");
    }
  };

  const eliminarVariante = (index) => {
    const nuevasVariantes = variantes.filter((_, i) => i !== index);
    setVariantes(nuevasVariantes);
    toast.info("Variante eliminada");
  };

  // Funciones para manejo de imágenes
  const handleImagenChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validar imagen
      ImageService.validateImage(file);

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPrincipalPreview(reader.result);
      };
      reader.readAsDataURL(file);

      setImagenPrincipal(file);
      toast.success("Imagen seleccionada");
    } catch (error) {
      toast.error(error.message);
      e.target.value = "";
    }
  };

  const eliminarImagenPreview = () => {
    setImagenPrincipal(null);
    setImagenPrincipalPreview("");
    const input = document.getElementById("imagen-principal-input");
    if (input) input.value = "";
  };

  // Manejar imagen de variante
  const handleImagenVarianteChange = (varianteId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      ImageService.validateImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenesVariantes((prev) => ({
          ...prev,
          [varianteId]: {
            file: file,
            preview: reader.result,
            url: prev[varianteId]?.url || null,
          },
        }));
      };
      reader.readAsDataURL(file);

      toast.success("Imagen de variante seleccionada");
    } catch (error) {
      toast.error(error.message);
      e.target.value = "";
    }
  };

  const eliminarImagenVariante = (varianteId) => {
    setImagenesVariantes((prev) => {
      const updated = { ...prev };
      delete updated[varianteId];
      return updated;
    });
    const input = document.getElementById(`imagen-variante-${varianteId}`);
    if (input) input.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precioBase.trim() || !categoriaId) {
      toast.error("Completa Nombre, Precio Base y Categoría");
      return;
    }
    if (variantes.length > 0) {
      const variantesInvalidas = variantes.some(
        (v) => !v.sku.trim() || !v.precio
      );
      if (variantesInvalidas) {
        toast.error("Todas las variantes deben tener SKU y precio");
        return;
      }
    }

    console.log("🔍 DEBUG - Imagen Principal:", {
      archivo: imagenPrincipal,
      preview: imagenPrincipalPreview,
      url: imagenPrincipalUrl,
      tieneArchivo: !!imagenPrincipal,
    });

    const productoPayload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria_id: categoriaId,
      precio_base: parseFloat(precioBase),
      marca: marca.trim(),
      activo: true,
    };

    setLoading(true);
    try {
      // Si hay imagen nueva, subirla primero
      if (imagenPrincipal && !producto?.id) {
        // Para productos nuevos, necesitamos crear el producto primero para obtener el ID
        // Marcar que hay imagen pendiente
        productoPayload.tiene_imagen_pendiente = true;
      }

      if (producto?.id) {
        // Modo edición: subir imagen si hay una nueva
        if (imagenPrincipal) {
          setSubiendoImagen(true);
          toast.info("Subiendo imagen...");
          const urls = await ImageService.uploadProductoImagen(
            producto.id,
            nombre,
            imagenPrincipal
          );
          productoPayload.imagen_url = urls.original;
          productoPayload.imagen_thumbnail_url = urls.thumbnail;
          setSubiendoImagen(false);
        }

        // Subir imágenes de variantes si hay (solo para variantes con ID real)
        const variantesConImagenes = [];
        for (const variante of variantes) {
          const imagenData = imagenesVariantes[variante.id];
          // Solo subir imagen si la variante tiene ID real (no temporal)
          const esVarianteExistente =
            variante.id && !variante.id.toString().startsWith("temp-");

          if (imagenData?.file && esVarianteExistente) {
            try {
              setSubiendoImagen(true);
              const urls = await ImageService.uploadVarianteImagen(
                producto.id,
                nombre,
                variante.id,
                imagenData.file
              );
              variantesConImagenes.push({
                ...variante,
                imagen_url: urls.original,
                imagen_thumbnail_url: urls.thumbnail,
              });
            } catch (error) {
              console.error(
                `Error subiendo imagen de variante ${variante.id}:`,
                error
              );
              variantesConImagenes.push(variante);
            }
          } else if (imagenData?.url) {
            // Mantener URL existente
            variantesConImagenes.push({
              ...variante,
              imagen_url: imagenData.url,
              imagen_thumbnail_url: imagenData.url,
            });
          } else {
            variantesConImagenes.push(variante);
          }
        }
        setSubiendoImagen(false);

        // Si el producto no tiene imagen pero hay variantes con imágenes, usar la primera
        if (
          !productoPayload.imagen_url &&
          variantesConImagenes.some((v) => v.imagen_url)
        ) {
          const primeraVarianteConImagen = variantesConImagenes.find(
            (v) => v.imagen_url
          );
          if (primeraVarianteConImagen) {
            productoPayload.imagen_url = primeraVarianteConImagen.imagen_url;
            productoPayload.imagen_thumbnail_url =
              primeraVarianteConImagen.imagen_thumbnail_url;
            console.log(
              "📸 Usando imagen de variante como imagen principal del producto"
            );
          }
        }

        // Actualizar producto con variantes
        const variantesFormateadas = variantesConImagenes.map((v) => ({
          sku: v.sku.trim(),
          atributos: v.atributos,
          precio: parseFloat(v.precio),
          costo: v.costo ? parseFloat(v.costo) : null,
          activo: v.activo,
          imagen_url: v.imagen_url || null,
          imagen_thumbnail_url: v.imagen_thumbnail_url || null,
        }));

        const payload = {
          ...productoPayload,
          variantes: variantesFormateadas,
          aplicarPrecioVariantes: aplicarPrecioVariantes,
        };

        const resultado = await ProductoService.actualizarProducto(
          producto.id,
          payload
        );

        console.log("✅ Respuesta del servidor:", resultado);
        toast.success("✅ Producto actualizado exitosamente");
      } else {
        // Modo creación: crear producto con variantes
        const variantesFormateadas = variantes.map((v) => ({
          sku: v.sku.trim(),
          atributos: v.atributos,
          precio: parseFloat(v.precio),
          costo: v.costo ? parseFloat(v.costo) : null,
          activo: v.activo,
        }));

        const resultado = await ProductoService.crearProducto({
          producto: productoPayload,
          variantes: variantesFormateadas,
        });

        // Si se creó el producto, subir imágenes
        if (resultado?.id) {
          const actualizaciones = {};

          // Subir imagen principal
          if (imagenPrincipal) {
            try {
              setSubiendoImagen(true);
              console.log("📸 Subiendo imagen principal...", {
                productoId: resultado.id,
                archivo: imagenPrincipal,
                nombreArchivo: imagenPrincipal.name,
                tipo: imagenPrincipal.type,
                tamaño: imagenPrincipal.size,
              });
              toast.info("Subiendo imagen principal...");
              const urls = await ImageService.uploadProductoImagen(
                resultado.id,
                nombre,
                imagenPrincipal
              );
              console.log("✅ Imagen subida exitosamente:", urls);
              actualizaciones.imagen_url = urls.original;
              actualizaciones.imagen_thumbnail_url = urls.thumbnail;
            } catch (imgError) {
              console.error("❌ Error subiendo imagen principal:", imgError);
              toast.warning("Error al subir imagen principal");
            }
          } else {
            console.log("⚠️ No hay imagen principal para subir");
          }

          // Declarar array para variantes con imágenes
          const variantesConImagenes = [];

          // Subir imágenes de variantes si las variantes ya fueron creadas
          if (
            resultado.variantes_producto &&
            resultado.variantes_producto.length > 0
          ) {
            for (const varianteCreada of resultado.variantes_producto) {
              // Buscar la variante local por SKU para obtener su imagen
              const varianteLocal = variantes.find(
                (v) => v.sku.trim() === varianteCreada.sku
              );
              const imagenData = varianteLocal
                ? imagenesVariantes[varianteLocal.id]
                : null;

              if (imagenData?.file) {
                try {
                  toast.info(
                    `Subiendo imagen de variante ${varianteCreada.sku}...`
                  );
                  const urls = await ImageService.uploadVarianteImagen(
                    resultado.id,
                    nombre,
                    varianteCreada.id, // Usar el ID real del backend
                    imagenData.file
                  );
                  variantesConImagenes.push({
                    id: varianteCreada.id,
                    sku: varianteCreada.sku,
                    imagen_url: urls.original,
                    imagen_thumbnail_url: urls.thumbnail,
                  });
                } catch (error) {
                  console.error(
                    `Error subiendo imagen de variante ${varianteCreada.sku}:`,
                    error
                  );
                }
              }
            }

            // Solo actualizar si hay imágenes de variantes
            if (variantesConImagenes.length > 0) {
              // Actualizar cada variante individualmente con su imagen
              for (const v of variantesConImagenes) {
                try {
                  await VarianteService.actualizarImagenVariante(
                    v.id,
                    v.imagen_url,
                    v.imagen_thumbnail_url
                  );
                  console.log(`✅ Variante ${v.sku} actualizada con imagen`);
                } catch (error) {
                  console.error(`Error actualizando variante ${v.sku}:`, error);
                }
              }
            }
          }

          // Si el producto no tiene imagen pero hay variantes con imágenes, usar la primera
          if (!actualizaciones.imagen_url && variantesConImagenes.length > 0) {
            const primeraVarianteConImagen = variantesConImagenes[0];
            actualizaciones.imagen_url = primeraVarianteConImagen.imagen_url;
            actualizaciones.imagen_thumbnail_url =
              primeraVarianteConImagen.imagen_thumbnail_url;
            console.log(
              "📸 Usando imagen de variante como imagen principal del producto"
            );
          }

          // Actualizar producto con las URLs de las imágenes principales solo si hay
          if (
            actualizaciones.imagen_url ||
            actualizaciones.imagen_thumbnail_url
          ) {
            try {
              await ProductoService.actualizarProducto(
                resultado.id,
                actualizaciones
              );
              console.log("✅ Producto actualizado con imágenes principales");
            } catch (updateError) {
              console.error(
                "Error actualizando imágenes principales:",
                updateError
              );
              toast.warning(
                "Producto creado pero error al actualizar imagen principal"
              );
            }
          }

          setSubiendoImagen(false);
        }

        toast.success("✅ Producto creado exitosamente");
      }
      if (refetch) await refetch();
      setShow(false);
    } catch (err) {
      console.error("❌ Error guardando producto:", err);
      console.error("   Mensaje:", err.message);
      console.error("   Stack:", err.stack);
      toast.error(err.message || "Error al guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-producto">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faBox} />
            </span>
            Nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
            placeholder="Ingresa el nombre del producto"
            required
          />
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faFileAlt} />
            </span>
            Descripción
          </label>
          <textarea
            className="form-control"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción detallada del producto"
            rows={3}
          />
        </div>

        {/* Sección de Imagen Principal */}
        <div className="form-group imagen-section">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faImage} />
            </span>
            Imagen del Producto
          </label>

          <div className="imagen-container">
            {imagenPrincipalPreview || imagenPrincipalUrl ? (
              <div className="imagen-preview">
                <img
                  src={imagenPrincipalPreview || imagenPrincipalUrl}
                  alt="Preview"
                  className="preview-img"
                />
                <button
                  type="button"
                  className="btn-eliminar-imagen"
                  onClick={eliminarImagenPreview}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ) : (
              <label htmlFor="imagen-principal-input" className="upload-area">
                <FontAwesomeIcon icon={faUpload} size="2x" />
                <p>Haz click o arrastra una imagen</p>
                <span className="upload-hint">JPG, PNG o WEBP (máx. 5MB)</span>
              </label>
            )}

            <input
              id="imagen-principal-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImagenChange}
              style={{ display: "none" }}
            />

            {!imagenPrincipalPreview && !imagenPrincipalUrl && (
              <button
                type="button"
                className="btn-seleccionar-imagen"
                onClick={() =>
                  document.getElementById("imagen-principal-input")?.click()
                }
              >
                <FontAwesomeIcon icon={faImage} /> Seleccionar Imagen
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faLayerGroup} />
            </span>
            Categoría <span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            required
          >
            <option value="">— Selecciona una categoría —</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </span>
            Precio Base <span className="required">*</span>
          </label>
          <input
            type="number"
            className="form-control"
            value={precioBase}
            onChange={(e) => setPrecioBase(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
          {producto?.id && variantes.length > 0 && (
            <div className="checkbox-aplicar-precio">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={aplicarPrecioVariantes}
                  onChange={(e) => setAplicarPrecioVariantes(e.target.checked)}
                />
                <span className="checkbox-text">
                  <FontAwesomeIcon icon={faCheck} className="check-icon" />
                  Aplicar nuevo precio a todas las variantes ({variantes.length}
                  )
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faCog} />
            </span>
            Marca
          </label>
          <input
            type="text"
            className="form-control"
            value={marca}
            onChange={(e) => setMarca(e.target.value.toUpperCase())}
            placeholder="Marca del producto (opcional)"
          />
        </div>

        <div className="variantes-section">
          <div className="variantes-header">
            <h4>
              <FontAwesomeIcon icon={faTags} /> Variantes del Producto
            </h4>
            {variantes.length > 0 && (
              <button
                type="button"
                className="btn-limpiar-variantes"
                onClick={eliminarTodasVariantes}
              >
                <FontAwesomeIcon icon={faTrash} /> Eliminar Todas
              </button>
            )}
          </div>

          {producto?.id && variantes.length > 0 && (
            <div className="info-edicion">
              <p>
                📝 <strong>Modo Edición:</strong> Las variantes actuales se
                muestran a continuación. Puedes modificar los precios/costos,
                eliminar variantes o agregar nuevas seleccionando tallas/colores
                adicionales.
              </p>
            </div>
          )}

          <div className="generador-variantes">
            <p className="info-text">
              Selecciona las tallas y colores para generar automáticamente todas
              las combinaciones de variantes.
            </p>

            <div className="atributos-selector">
              <label className="selector-label">
                <FontAwesomeIcon icon={faTags} /> Tallas Disponibles
              </label>
              <div className="input-personalizado">
                <input
                  type="text"
                  className="form-control"
                  value={inputTallaPersonalizada}
                  onChange={(e) => setInputTallaPersonalizada(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), agregarTallaPersonalizada())
                  }
                  placeholder="Agregar talla personalizada (ej: 32, 34, 2XL)"
                />
                <button
                  type="button"
                  className="btn-agregar-personalizado"
                  onClick={agregarTallaPersonalizada}
                >
                  + Agregar
                </button>
              </div>
              <div className="atributos-grid">
                {TALLAS_DISPONIBLES.map((talla) => (
                  <button
                    key={talla}
                    type="button"
                    className={
                      "atributo-btn " +
                      (tallasSeleccionadas.includes(talla) ? "selected" : "")
                    }
                    onClick={() => toggleTalla(talla)}
                  >
                    {tallasSeleccionadas.includes(talla) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {talla}
                  </button>
                ))}
                {tallasPersonalizadas.map((talla) => (
                  <button
                    key={talla}
                    type="button"
                    className={
                      "atributo-btn personalizado " +
                      (tallasSeleccionadas.includes(talla) ? "selected" : "")
                    }
                    onClick={() => toggleTalla(talla)}
                  >
                    {tallasSeleccionadas.includes(talla) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {talla}
                    <span
                      className="btn-eliminar-personalizado"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarTallaPersonalizada(talla);
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="atributos-selector">
              <label className="selector-label">
                <FontAwesomeIcon icon={faTags} /> Colores Disponibles
              </label>
              <div className="input-personalizado">
                <input
                  type="text"
                  className="form-control"
                  value={inputColorPersonalizado}
                  onChange={(e) => setInputColorPersonalizado(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), agregarColorPersonalizado())
                  }
                  placeholder="Agregar color personalizado (ej: Fucsia, Azul Rey, Hueso)"
                />
                <button
                  type="button"
                  className="btn-agregar-personalizado"
                  onClick={agregarColorPersonalizado}
                >
                  + Agregar
                </button>
              </div>
              <div className="atributos-grid">
                {COLORES_DISPONIBLES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={
                      "atributo-btn " +
                      (coloresSeleccionados.includes(color) ? "selected" : "")
                    }
                    onClick={() => toggleColor(color)}
                  >
                    {coloresSeleccionados.includes(color) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {color}
                  </button>
                ))}
                {coloresPersonalizados.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={
                      "atributo-btn personalizado " +
                      (coloresSeleccionados.includes(color) ? "selected" : "")
                    }
                    onClick={() => toggleColor(color)}
                  >
                    {coloresSeleccionados.includes(color) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {color}
                    <span
                      className="btn-eliminar-personalizado"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarColorPersonalizado(color);
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="atributos-selector">
              <div className="selector-label-con-input">
                <label className="selector-label">
                  <FontAwesomeIcon icon={faTags} />
                  <input
                    type="text"
                    className="nombre-atributo-input"
                    value={nombreAtributoPersonalizado}
                    onChange={(e) =>
                      setNombreAtributoPersonalizado(e.target.value)
                    }
                    placeholder="Nombre del atributo"
                  />
                </label>
                <small className="info-text-small">
                  Ejemplo: "Diseño", "Aroma", "Sabor", "Material", etc.
                </small>
              </div>
              <div className="input-personalizado">
                <input
                  type="text"
                  className="form-control"
                  value={inputAtributoPersonalizado}
                  onChange={(e) =>
                    setInputAtributoPersonalizado(e.target.value)
                  }
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), agregarAtributoPersonalizado())
                  }
                  placeholder={`Agregar ${nombreAtributoPersonalizado.toLowerCase()} (ej: Floral, Navideño, Minimalista)`}
                />
                <button
                  type="button"
                  className="btn-agregar-personalizado"
                  onClick={agregarAtributoPersonalizado}
                >
                  + Agregar
                </button>
              </div>
              <div className="atributos-grid">
                {atributosPersonalizados.map((atributo) => (
                  <button
                    key={atributo}
                    type="button"
                    className={
                      "atributo-btn personalizado " +
                      (atributosSeleccionados.includes(atributo)
                        ? "selected"
                        : "")
                    }
                    onClick={() => toggleAtributoPersonalizado(atributo)}
                  >
                    {atributosSeleccionados.includes(atributo) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {atributo}
                    <span
                      className="btn-eliminar-personalizado"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarAtributoPersonalizado(atributo);
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
              {atributosPersonalizados.length === 0 && (
                <p className="info-text-italic">
                  💡 Útil para productos sin talla/color como velas, perfumes,
                  alimentos, etc.
                </p>
              )}
            </div>

            <div className="form-group">
              <label>
                <FontAwesomeIcon icon={faDollarSign} /> Costo (opcional)
              </label>
              <input
                type="number"
                className="form-control"
                value={costoVariante}
                onChange={(e) => setCostoVariante(e.target.value)}
                placeholder="Costo de adquisición"
                step="0.01"
                min="0"
              />
              <small className="form-text">
                Este costo se aplicará a todas las variantes generadas
              </small>
            </div>

            <button
              type="button"
              className="btn-generar-variantes"
              onClick={generarVariantes}
              disabled={
                !precioBase ||
                (tallasSeleccionadas.length === 0 &&
                  coloresSeleccionados.length === 0 &&
                  atributosSeleccionados.length === 0)
              }
            >
              <FontAwesomeIcon icon={faMagic} />{" "}
              {variantes.length > 0
                ? "Agregar Más Variantes"
                : "Generar Variantes Automáticamente"}
            </button>

            {tallasSeleccionadas.length > 0 &&
              coloresSeleccionados.length > 0 && (
                <p className="variantes-count">
                  Se generarán{" "}
                  <strong>
                    {tallasSeleccionadas.length * coloresSeleccionados.length}
                  </strong>{" "}
                  variantes
                </p>
              )}
            {tallasSeleccionadas.length > 0 &&
              coloresSeleccionados.length === 0 && (
                <p className="variantes-count">
                  Se generarán <strong>{tallasSeleccionadas.length}</strong>{" "}
                  variantes
                </p>
              )}
            {coloresSeleccionados.length > 0 &&
              tallasSeleccionadas.length === 0 && (
                <p className="variantes-count">
                  Se generarán <strong>{coloresSeleccionados.length}</strong>{" "}
                  variantes
                </p>
              )}
          </div>

          {variantes.length > 0 && (
            <div className="variantes-generadas">
              <p className="success-text">
                ✨ {variantes.length} variantes en total. Puedes editar
                precios/SKUs individualmente o eliminar variantes específicas.
              </p>
              <div className="variantes-list">
                {variantes.map((variante, index) => (
                  <div key={variante.id} className="variante-item-compacta">
                    <div className="variante-info">
                      <span className="variante-numero">#{index + 1}</span>
                      <span className="variante-sku">
                        <FontAwesomeIcon icon={faBarcode} /> {variante.sku}
                      </span>
                      <span className="variante-atributos">
                        {variante.atributos.talla && (
                          <span className="badge">
                            Talla: {variante.atributos.talla}
                          </span>
                        )}
                        {variante.atributos.color && (
                          <span className="badge">
                            Color: {variante.atributos.color}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="variante-precios">
                      <input
                        type="text"
                        className="input-sku"
                        value={variante.sku}
                        onChange={(e) =>
                          actualizarVariante(
                            index,
                            "sku",
                            e.target.value.toUpperCase()
                          )
                        }
                        placeholder="SKU"
                      />
                      <input
                        type="number"
                        className="input-precio"
                        value={variante.precio}
                        onChange={(e) =>
                          actualizarVariante(index, "precio", e.target.value)
                        }
                        placeholder="Precio"
                        step="0.01"
                        min="0"
                      />
                      <input
                        type="number"
                        className="input-costo"
                        value={variante.costo}
                        onChange={(e) =>
                          actualizarVariante(index, "costo", e.target.value)
                        }
                        placeholder="Costo"
                        step="0.01"
                        min="0"
                      />
                      <div className="variante-imagen-control">
                        {imagenesVariantes[variante.id]?.preview ||
                        imagenesVariantes[variante.id]?.url ? (
                          <div className="variante-imagen-preview">
                            <img
                              src={
                                imagenesVariantes[variante.id]?.preview ||
                                imagenesVariantes[variante.id]?.url
                              }
                              alt="Variante"
                            />
                            <button
                              type="button"
                              className="btn-eliminar-img-variante"
                              onClick={() =>
                                eliminarImagenVariante(variante.id)
                              }
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              id={`imagen-variante-${variante.id}`}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={(e) =>
                                handleImagenVarianteChange(variante.id, e)
                              }
                              style={{ display: "none" }}
                            />
                            <button
                              type="button"
                              className="btn-imagen-variante"
                              onClick={() =>
                                document
                                  .getElementById(
                                    `imagen-variante-${variante.id}`
                                  )
                                  ?.click()
                              }
                              title="Agregar imagen"
                            >
                              <FontAwesomeIcon icon={faImage} />
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-eliminar-variante"
                        onClick={() => eliminarVariante(index)}
                        title="Eliminar variante"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={loading || subiendoImagen}
        >
          {(loading || subiendoImagen) && (
            <FontAwesomeIcon icon={faSpinner} spin className="spinner" />
          )}
          {subiendoImagen
            ? "Subiendo imagen..."
            : loading
            ? "Guardando..."
            : producto?.id
            ? "Actualizar Producto"
            : "Guardar Producto"}
        </button>
      </form>
    </div>
  );
};

export default RegistroProducto;
