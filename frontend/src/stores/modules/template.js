import axiosInstance from "@/utils/axios";
import { toast } from "vue-sonner";

export const DEFAULT_FALLBACK_TEMPLATES = [
  {
    id: "tpl-default-panitia",
    code: "TPL-SK-PANITIA-01",
    title: "SK Pengangkatan Panitia Pelaksana Kegiatan",
    type: "SK Non-Honor",
    description: "Template standar pengangkatan susunan kepanitiaan kegiatan akademik/non-akademik di lingkungan Politeknik Negeri Batam.",
    filepath: "templates/submission-approved-template.docx",
    schema_fields: [
      { key: "nama_kegiatan", label: "Nama Kegiatan / Seminar", type: "text", required: true, placeholder: "Contoh: Seminar Nasional Applied Technology 2026" },
      { key: "tahun_anggaran", label: "Tahun Anggaran", type: "number", required: true, placeholder: "2026" },
      { key: "tanggal_mulai", label: "Tanggal Mulai Pelaksanaan", type: "date", required: true },
      { key: "tanggal_selesai", label: "Tanggal Selesai Pelaksanaan", type: "date", required: true },
      { key: "lokasi", label: "Tempat / Lokasi Pelaksanaan", type: "text", required: true, placeholder: "Contoh: Auditorium Gedung Utama Polibatam" },
      { key: "ketua_panitia", label: "Nama Ketua Panitia", type: "text", required: true },
      { key: "sumber_dana", label: "Sumber Pendanaan", type: "select", options: ["DIPA Polibatam", "Mandiri / Swadana", "Kerjasama Industri / Sponsor"], required: true },
    ],
    is_active: true,
  },
  {
    id: "tpl-default-pembimbing",
    code: "TPL-SK-PEMBIMBING-01",
    title: "SK Penetapan Dosen Pembimbing Tugas Akhir / Skripsi",
    type: "SK Non-Honor",
    description: "Template penugasan dosen pembimbing utama dan pendamping untuk tugas akhir mahasiswa.",
    filepath: "templates/submission-approved-template.docx",
    schema_fields: [
      { key: "semester", label: "Semester Akademik", type: "select", options: ["Ganjil", "Genap"], required: true },
      { key: "tahun_akademik", label: "Tahun Akademik", type: "text", required: true, placeholder: "Contoh: 2026/2027" },
      { key: "jurusan", label: "Jurusan", type: "text", required: true },
      { key: "program_studi", label: "Program Studi", type: "text", required: true },
    ],
    is_active: true,
  },
];

const errorMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ERR_NETWORK" || !error?.response) {
    return "Server Backend belum aktif (port 4005). Menjalankan dengan mode pratinjau.";
  }
  return "Terjadi kesalahan saat memproses data";
};

const template = {
  namespaced: true,
  state: {
    loading: {
      templates: false,
      template: false,
      scan: false,
      action: false,
    },
    templates: [],
    template: null,
    table_options: {
      search: "",
      page: 1,
      page_size: 10,
      total_items: 0,
      total_pages: 0,
    },
    scan_result: {
      tags: [],
      suggested_schema: [],
      count: 0,
    },
  },
  mutations: {
    SET_IS_LOADING(state, { key, value }) {
      state.loading[key] = value;
    },
    SET_TEMPLATES(state, payload) {
      state.templates = payload || [];
    },
    SET_TEMPLATE(state, payload) {
      state.template = payload;
    },
    SET_TABLE_OPTIONS(state, payload) {
      Object.assign(state.table_options, payload);
    },
    SET_SCAN_RESULT(state, payload) {
      state.scan_result = payload || { tags: [], suggested_schema: [], count: 0 };
    },
  },
  actions: {
    FetchTemplates: async ({ commit, state }, params = {}) => {
      commit("SET_IS_LOADING", { key: "templates", value: true });
      try {
        const queryParams = {
          page: params.page || state.table_options.page,
          page_size: params.page_size || state.table_options.page_size,
          search: params.search !== undefined ? params.search : state.table_options.search,
          type: params.type,
          is_active: params.is_active,
        };

        const response = await axiosInstance({
          url: "/templates",
          method: "GET",
          params: queryParams,
        });

        const rows = response.data?.data || [];
        const pagination = response.data?.pagination || {};

        if (rows.length > 0) {
          commit("SET_TEMPLATES", rows);
          commit("SET_TABLE_OPTIONS", {
            total_items: pagination.total || rows.length,
            total_pages: pagination.last_page || 1,
            page: pagination.page || 1,
          });
          return rows;
        }

        // Jika backend belum punya template di DB, gunakan fallback resmi
        commit("SET_TEMPLATES", DEFAULT_FALLBACK_TEMPLATES);
        return DEFAULT_FALLBACK_TEMPLATES;
      } catch (error) {
        console.warn("Backend template offline / error:", error.message);
        // Fallback anggun: sediakan template default tanpa error popup mengganggu
        commit("SET_TEMPLATES", DEFAULT_FALLBACK_TEMPLATES);
        return DEFAULT_FALLBACK_TEMPLATES;
      } finally {
        commit("SET_IS_LOADING", { key: "templates", value: false });
      }
    },

    GetById: async ({ commit }, id) => {
      commit("SET_IS_LOADING", { key: "template", value: true });
      try {
        const response = await axiosInstance({
          url: `/templates/${id}`,
          method: "GET",
        });

        const data = response.data?.data || null;
        commit("SET_TEMPLATE", data);
        return data;
      } catch (error) {
        const found = DEFAULT_FALLBACK_TEMPLATES.find((t) => t.id === id || t.code === id);
        if (found) {
          commit("SET_TEMPLATE", found);
          return found;
        }
        toast.error(errorMessage(error));
        return null;
      } finally {
        commit("SET_IS_LOADING", { key: "template", value: false });
      }
    },

    ScanVariables: async ({ commit }, file) => {
      commit("SET_IS_LOADING", { key: "scan", value: true });
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axiosInstance({
          url: "/templates/scan-variables",
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          data: formData,
        });

        const result = response.data?.data || { tags: [], suggested_schema: [], count: 0 };
        commit("SET_SCAN_RESULT", result);
        toast.success(`Berhasil memindai ${result.count || 0} tag variabel`);
        return result;
      } catch (error) {
        toast.error(errorMessage(error));
        return null;
      } finally {
        commit("SET_IS_LOADING", { key: "scan", value: false });
      }
    },

    Create: async ({ commit, dispatch }, formData) => {
      commit("SET_IS_LOADING", { key: "action", value: true });
      try {
        const response = await axiosInstance({
          url: "/templates",
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          data: formData,
        });

        toast.success(response.data?.message || "Template berhasil dibuat");
        dispatch("FetchTemplates");
        return response.data?.data;
      } catch (error) {
        toast.error(errorMessage(error));
        return null;
      } finally {
        commit("SET_IS_LOADING", { key: "action", value: false });
      }
    },

    Update: async ({ commit, dispatch }, { id, formData }) => {
      commit("SET_IS_LOADING", { key: "action", value: true });
      try {
        const response = await axiosInstance({
          url: `/templates/${id}`,
          method: "PUT",
          headers: { "Content-Type": "multipart/form-data" },
          data: formData,
        });

        toast.success(response.data?.message || "Template berhasil diperbarui");
        dispatch("FetchTemplates");
        return response.data?.data;
      } catch (error) {
        toast.error(errorMessage(error));
        return null;
      } finally {
        commit("SET_IS_LOADING", { key: "action", value: false });
      }
    },

    Delete: async ({ commit, dispatch }, id) => {
      commit("SET_IS_LOADING", { key: "action", value: true });
      try {
        const response = await axiosInstance({
          url: `/templates/${id}`,
          method: "DELETE",
        });

        toast.success(response.data?.message || "Template berhasil dihapus");
        dispatch("FetchTemplates");
        return true;
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      } finally {
        commit("SET_IS_LOADING", { key: "action", value: false });
      }
    },
  },
};

export default template;
