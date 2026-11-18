<template>
  <div>
    <VCard
      title="Template Dokumen"
      subtitle="Manajemen template master surat dan skema variabel dinamis"
    >
      <VDivider />

      <VCardText>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <div style="inline-size: 20rem;">
            <AppTextField
              v-model="search"
              density="compact"
              placeholder="Cari kode atau judul..."
              append-inner-icon="tabler-search"
              clearable
              @update:model-value="onSearch"
            />
          </div>
          <div>
            <VBtn
              color="primary"
              @click="openCreateDialog"
            >
              <VIcon
                icon="tabler-plus"
                start
              />
              Tambah Template
            </VBtn>
          </div>
        </div>
      </VCardText>

      <VDivider />

      <!-- Tabel Daftar Template -->
      <VCardText class="px-0 pt-0">
        <VDataTableServer
          v-model:items-per-page="table_options.page_size"
          v-model:page="table_options.page"
          :items-length="table_options.total_items"
          :headers="headers"
          :items="templates"
          :loading="loading"
          @update:options="onOptionsUpdate"
        >
          <!-- Kolom Kode -->
          <template #item.code="{ item }">
            <code>{{ item.code }}</code>
          </template>

          <!-- Kolom Judul & Deskripsi -->
          <template #item.title="{ item }">
            <div class="font-weight-medium">
              {{ item.title }}
            </div>
            <div
              v-if="item.description"
              class="text-caption text-medium-emphasis text-truncate"
              style="max-width: 320px;"
            >
              {{ item.description }}
            </div>
          </template>

          <!-- Kolom Jenis -->
          <template #item.type="{ item }">
            <VChip
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ item.type }}
            </VChip>
          </template>

          <!-- Kolom Variabel Dinamis -->
          <template #item.variables="{ item }">
            <VChip
              size="small"
              color="info"
              variant="outlined"
            >
              {{ item.schema_fields?.length || 0 }} variabel
            </VChip>
          </template>

          <!-- Kolom Status Aktif -->
          <template #item.is_active="{ item }">
            <VSwitch
              :model-value="item.is_active"
              density="compact"
              color="success"
              hide-details
              @update:model-value="val => toggleStatus(item, val)"
            />
          </template>

          <!-- Kolom Aksi -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <IconBtn
                icon="tabler-edit"
                color="primary"
                @click="openEditDialog(item)"
              />
              <IconBtn
                icon="tabler-trash"
                color="error"
                @click="confirmDelete(item)"
              />
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Modal Dialog Tambah / Edit Template -->
    <VDialog
      v-model="dialog"
      max-width="850"
      persistent
    >
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>{{ editingId ? 'Edit Template Dokumen' : 'Tambah Template Dokumen' }}</span>
          <DialogCloseBtn @click="dialog = false" />
        </VCardTitle>

        <VDivider />

        <VCardText class="pt-4">
          <VForm
            ref="refForm"
            validate-on="submit lazy"
            @submit.prevent="saveTemplate"
          >
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.code"
                  label="Kode Template*"
                  placeholder="Contoh: TPL-SK-PANITIA-01"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="form.type"
                  label="Jenis Surat*"
                  :items="['SK Honor', 'SK Non-Honor', 'Perdir']"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.title"
                  label="Judul Template*"
                  placeholder="Contoh: SK Pengangkatan Panitia Kegiatan"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <AppTextarea
                  v-model="form.description"
                  label="Deskripsi Peruntukan"
                  rows="2"
                  placeholder="Jelaskan peruntukan template ini untuk pengusul..."
                />
              </VCol>

              <!-- Upload File Master DOCX -->
              <VCol
                cols="12"
                md="8"
              >
                <VFileInput
                  v-model="form.file"
                  label="File Template Master (.docx)*"
                  accept=".docx"
                  :rules="editingId ? [] : [requiredValidator]"
                  messages="Upload file Word (.docx) yang memiliki tag placeholder {...}"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
                class="d-flex align-center"
              >
                <VBtn
                  color="secondary"
                  variant="tonal"
                  class="w-100 mt-md-n4"
                  :loading="loadingScan"
                  :disabled="!selectedFile"
                  @click="scanFileVariables"
                >
                  <VIcon
                    icon="tabler-scan"
                    start
                  />
                  Pindai Tag (.docx)
                </VBtn>
              </VCol>

              <VCol cols="12">
                <VSwitch
                  v-model="form.is_active"
                  label="Status Aktif"
                  messages="Template aktif akan muncul di katalog pengajuan pemohon"
                />
              </VCol>
            </VRow>

            <VDivider class="my-6" />

            <!-- Konfigurasi Variabel Dinamis (schema_fields) -->
            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <h4 class="text-subtitle-1 font-weight-bold">
                  Definisi Variabel Formulir ({{ form.schema_fields.length }})
                </h4>
                <p class="text-caption text-medium-emphasis mb-0">
                  Tag placeholder <code>{key}</code> di dokumen akan digantikan dengan input berikut.
                </p>
              </div>
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                @click="addField"
              >
                <VIcon
                  icon="tabler-plus"
                  start
                />
                Tambah Variabel
              </VBtn>
            </div>

            <VAlert
              v-if="!form.schema_fields.length"
              variant="tonal"
              color="info"
              density="compact"
              class="mb-4"
            >
              Belum ada variabel. Klik <strong>Pindai Tag (.docx)</strong> di atas atau tambah variabel secara manual.
            </VAlert>

            <VTable
              v-else
              density="compact"
              class="border rounded mb-4"
            >
              <thead>
                <tr>
                  <th style="inline-size: 25%;">
                    Key Placeholder
                  </th>
                  <th style="inline-size: 35%;">
                    Label Input
                  </th>
                  <th style="inline-size: 25%;">
                    Tipe Data
                  </th>
                  <th style="inline-size: 10%;">
                    Wajib
                  </th>
                  <th style="inline-size: 5%;">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(field, idx) in form.schema_fields"
                  :key="idx"
                >
                  <td>
                    <AppTextField
                      v-model="field.key"
                      density="compact"
                      placeholder="nama_kegiatan"
                      :rules="[requiredValidator]"
                    />
                  </td>
                  <td>
                    <AppTextField
                      v-model="field.label"
                      density="compact"
                      placeholder="Nama Kegiatan"
                      :rules="[requiredValidator]"
                    />
                  </td>
                  <td>
                    <AppSelect
                      v-model="field.type"
                      density="compact"
                      :items="['text', 'number', 'date', 'textarea', 'select']"
                    />
                  </td>
                  <td class="text-center">
                    <VCheckbox
                      v-model="field.required"
                      density="compact"
                      hide-details
                    />
                  </td>
                  <td>
                    <IconBtn
                      icon="tabler-trash"
                      color="error"
                      size="small"
                      @click="removeField(idx)"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            variant="tonal"
            color="secondary"
            @click="dialog = false"
          >
            Batal
          </VBtn>
          <VBtn
            color="primary"
            :loading="loadingAction"
            @click="saveTemplate"
          >
            Simpan Template
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup>
import Swal from 'sweetalert2'

const store = useVuex()

const headers = ref([
  { title: 'Kode', value: 'code', sortable: false },
  { title: 'Judul Template', value: 'title', sortable: false },
  { title: 'Jenis', value: 'type', sortable: false },
  { title: 'Variabel', value: 'variables', sortable: false },
  { title: 'Status', value: 'is_active', sortable: false },
  { title: 'Aksi', value: 'actions', sortable: false },
])

const search = ref('')
const dialog = ref(false)
const editingId = ref(null)
const refForm = ref()

const initialForm = () => ({
  code: '',
  title: '',
  type: 'SK Non-Honor',
  description: '',
  file: null,
  is_active: true,
  schema_fields: [],
})

const form = ref(initialForm())

const loading = computed(() => store.state.template?.loading?.templates || false)
const loadingScan = computed(() => store.state.template?.loading?.scan || false)
const loadingAction = computed(() => store.state.template?.loading?.action || false)
const templates = computed(() => store.state.template?.templates || [])
const table_options = computed({
  get: () => store.state.template?.table_options || { page: 1, page_size: 10, total_items: 0 },
  set: val => store.commit('template/SET_TABLE_OPTIONS', val),
})

const selectedFile = computed(() => {
  if (!form.value.file) return null
  return Array.isArray(form.value.file) ? form.value.file[0] : form.value.file
})

const fetchList = () => {
  store.dispatch('template/FetchTemplates', {
    search: search.value,
  })
}

const onSearch = () => {
  store.commit('template/SET_TABLE_OPTIONS', { page: 1 })
  fetchList()
}

const onOptionsUpdate = opts => {
  store.commit('template/SET_TABLE_OPTIONS', {
    page: opts.page,
    page_size: opts.itemsPerPage,
  })
  fetchList()
}

const openCreateDialog = () => {
  editingId.value = null
  form.value = initialForm()
  dialog.value = true
}

const openEditDialog = item => {
  editingId.value = item.id
  form.value = {
    code: item.code,
    title: item.title,
    type: item.type,
    description: item.description || '',
    file: null,
    is_active: !!item.is_active,
    schema_fields: Array.isArray(item.schema_fields) ? JSON.parse(JSON.stringify(item.schema_fields)) : [],
  }
  dialog.value = true
}

const addField = () => {
  form.value.schema_fields.push({
    key: `var_${form.value.schema_fields.length + 1}`,
    label: `Variabel ${form.value.schema_fields.length + 1}`,
    type: 'text',
    required: true,
  })
}

const removeField = idx => {
  form.value.schema_fields.splice(idx, 1)
}

const scanFileVariables = async () => {
  if (!selectedFile.value) return
  const result = await store.dispatch('template/ScanVariables', selectedFile.value)
  if (result && result.suggested_schema) {
    // Gabungkan atau timpa schema fields
    form.value.schema_fields = result.suggested_schema
  }
}

const toggleStatus = async (item, val) => {
  const formData = new FormData()
  formData.append('is_active', val)
  await store.dispatch('template/Update', { id: item.id, formData })
}

const saveTemplate = async () => {
  const { valid } = await refForm.value.validate()
  if (!valid) return

  const formData = new FormData()
  formData.append('code', form.value.code)
  formData.append('title', form.value.title)
  formData.append('type', form.value.type)
  formData.append('description', form.value.description || '')
  formData.append('is_active', form.value.is_active)
  formData.append('schema_fields', JSON.stringify(form.value.schema_fields))

  if (selectedFile.value) {
    formData.append('file', selectedFile.value)
  }

  let success = false
  if (editingId.value) {
    success = await store.dispatch('template/Update', { id: editingId.value, formData })
  } else {
    success = await store.dispatch('template/Create', formData)
  }

  if (success) {
    dialog.value = false
    fetchList()
  }
}

const confirmDelete = async item => {
  const confirm = await Swal.fire({
    title: 'Hapus Template?',
    text: `Template "${item.title}" akan dihapus secara permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    customClass: {
      confirmButton: 'v-btn v-btn--elevated bg-error text-white mr-3',
      cancelButton: 'v-btn v-btn--tonal bg-secondary text-white',
    },
    buttonsStyling: false,
  })

  if (confirm.isConfirmed) {
    await store.dispatch('template/Delete', item.id)
  }
}

onMounted(() => {
  fetchList()
})
</script>

