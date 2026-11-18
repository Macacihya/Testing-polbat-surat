<template>
  <VForm
    ref="ref_form"
    validate-on="submit lazy"
    @submit.prevent="() => {}"
  >
    <VCard
      :loading="loading || loadingTemplates"
      class="overflow-visible"
      flat
    >
      <div class="sticky-header bg-background border-b">
        <VCardText class="d-flex justify-space-between items-center">
          <div>
            <VCardTitle>
              Form Pengajuan Surat
            </VCardTitle>
            <VCardSubtitle>
              Pengajuan Surat Keputusan berbasis template dinamis atau formulir manual
            </VCardSubtitle>
          </div>
          <div class="d-flex flex-row-reverse gap-3">
            <VBtn
              :loading="loading"
              @click="onPosted"
            >
              <VIcon
                icon="tabler-send"
                start
              />           
              Ajukan
            </VBtn>
            <VBtn
              type="submit"
              :loading="loading"
              @click="handleSubmit"
            >
              <VIcon
                icon="tabler-device-floppy"
                start
              />           
              {{ submission_id ? 'Edit Pengajuan' : 'Simpan Sebagai Draft' }}
            </VBtn>
            <VBtn
              variant="tonal"
              @click="handleClose"
            >
              <VIcon
                icon="tabler-x"
                start
              />
              Kembali
            </VBtn>
          </div>
        </VCardText>
      </div>

      <VCardText>
        <!-- Toggle Mode Pengajuan -->
        <VCard
          variant="outlined"
          class="mb-6 p-2"
        >
          <VCardText class="d-flex flex-wrap justify-space-between align-center gap-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Metode Pengisian Berkas
              </div>
              <div class="text-caption text-medium-emphasis">
                Pilih pengajuan berbasis template resmi (otomatis) atau susun naskah hukum secara manual.
              </div>
            </div>
            <VBtnToggle
              v-model="submissionMode"
              mandatory
              color="primary"
              variant="outlined"
              density="comfortable"
            >
              <VBtn value="template">
                <VIcon
                  icon="tabler-template"
                  start
                />
                Berbasis Template (Rekomendasi)
              </VBtn>
              <VBtn value="manual">
                <VIcon
                  icon="tabler-edit"
                  start
                />
                Input Manual
              </VBtn>
            </VBtnToggle>
          </VCardText>
        </VCard>

        <!-- SEKSI 1: KATALOG TEMPLATE (Jika Mode Template) -->
        <div
          v-if="submissionMode === 'template'"
          class="mb-8"
        >
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <h3 class="text-h6 font-weight-bold">
                Pilih Template Dokumen
              </h3>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Pilih format surat yang sesuai. Variabel formulir akan menyesuaikan secara otomatis.
              </p>
            </div>
            <VChip
              v-if="selectedTemplate"
              color="success"
              variant="tonal"
              size="small"
            >
              Template Terpilih: {{ selectedTemplate.title }}
            </VChip>
          </div>

          <!-- Alert jika belum ada template dari backend -->
          <VAlert
            v-if="!templates.length && !loadingTemplates"
            variant="tonal"
            color="info"
            icon="tabler-info-circle"
            class="mb-4"
          >
            Belum ada template aktif dari backend. Anda dapat menggunakan mode <strong>Input Manual</strong> di atas atau menambahkan template di menu Admin.
          </VAlert>

          <!-- Grid Kartu Template -->
          <VRow v-else>
            <VCol
              v-for="item in templates"
              :key="item.id"
              cols="12"
              sm="6"
              md="4"
            >
              <VCard
                variant="outlined"
                :class="[
                  'cursor-pointer transition-all h-100',
                  template_id === item.id ? 'border-primary bg-primary-subtle ring-2 ring-primary' : 'hover-shadow'
                ]"
                @click="selectTemplate(item)"
              >
                <VCardItem>
                  <template #prepend>
                    <VAvatar
                      :color="template_id === item.id ? 'primary' : 'secondary'"
                      variant="tonal"
                      rounded
                    >
                      <VIcon icon="tabler-file-text" />
                    </VAvatar>
                  </template>

                  <VCardTitle class="text-truncate">
                    {{ item.title }}
                  </VCardTitle>
                  <VCardSubtitle>
                    <code>{{ item.code }}</code> · {{ item.type }}
                  </VCardSubtitle>
                </VCardItem>

                <VCardText class="pt-0">
                  <p class="text-body-2 text-medium-emphasis text-truncate-2 mb-3">
                    {{ item.description || 'Template resmi SK Politeknik Negeri Batam.' }}
                  </p>

                  <div class="d-flex justify-space-between align-center">
                    <VChip
                      size="x-small"
                      color="primary"
                      variant="outlined"
                    >
                      {{ item.schema_fields?.length || 0 }} Variabel Dinamis
                    </VChip>
                    <VBtn
                      size="x-small"
                      :variant="template_id === item.id ? 'elevated' : 'tonal'"
                      :color="template_id === item.id ? 'primary' : 'secondary'"
                    >
                      {{ template_id === item.id ? 'Dipilih' : 'Gunakan' }}
                    </VBtn>
                  </div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </div>

        <VDivider class="my-6" />

        <!-- SEKSI 2: INFORMASI UTAMA SURAT -->
        <div class="mb-4">
          <h3 class="text-h6 font-weight-bold mb-1">
            Informasi Pokok Pengajuan
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            Isi judul, tanggal terbit, dan lampiran pendukung pengajuan.
          </p>
        </div>

        <VRow>
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="title"
              label="Judul Surat Menetapkan/Peraturan*"
              placeholder="Contoh: SK Pengangkatan Panitia Workshop PBL"
              :rules="[requiredValidator]"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <AppSelect
              v-model="type"
              label="Jenis Surat*"
              :items="['SK Honor', 'SK Non-Honor', 'Perdir']"
              :rules="[requiredValidator]"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <AppDateTimePicker
              v-model="pickup_plan"
              label="Tanggal Terbit SK*"
              :rules="[requiredValidator]"
            />
          </VCol>

          <VCol cols="12">
            <VSwitch
              v-model="is_attachment"
              :label="`Apakah ada lampiran pendukung? (${is_attachment ? 'Ya' : 'Tidak'})`"
              messages="Unggah dokumen lampiran (PDF/DOCX) jika diperlukan"
            />
          </VCol>

          <VCol
            v-if="is_attachment"
            cols="12"
            md="6"
          >
            <VFileInput
              v-if="submission_id"
              v-model="filepath_attachment"
              label="Lampiran"
              messages="Upload lampiran baru jika ingin mengganti"
            />
            <VFileInput
              v-else
              v-model="filepath_attachment"
              label="Lampiran"
              :rules="[requiredValidator]"
            />
          </VCol>
        </VRow>

        <!-- SEKSI 3A: FORM GENERATOR DINAMIS (Jika Mode Template) -->
        <div
          v-if="submissionMode === 'template' && selectedTemplate"
          class="mt-8"
        >
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <h3 class="text-h6 font-weight-bold">
                Variabel Dokumen: {{ selectedTemplate.title }}
              </h3>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Nilai yang Anda masukkan akan disisipkan ke dalam naskah dinas resmi.
              </p>
            </div>
            <VChip
              size="small"
              color="info"
              variant="tonal"
            >
              Klausul Hukum Dikunci Otomatis
            </VChip>
          </div>

          <VCard
            variant="tonal"
            color="primary"
            class="mb-6"
          >
            <VCardText class="d-flex align-center gap-3">
              <VIcon
                icon="tabler-shield-check"
                size="28"
              />
              <div class="text-body-2">
                Naskah hukum baku (konsiderans <em>Menimbang</em>, <em>Mengingat</em>, dan format ketetapan) telah distandarkan oleh template ini. Anda tidak perlu menyusun teks hukum secara manual.
              </div>
            </VCardText>
          </VCard>

          <VRow>
            <VCol
              v-for="field in selectedTemplate.schema_fields || []"
              :key="field.key"
              cols="12"
              :md="field.type === 'textarea' ? 12 : 6"
            >
              <!-- Tipe Text -->
              <AppTextField
                v-if="!field.type || field.type === 'text'"
                v-model="template_values[field.key]"
                :label="`${field.label}${field.required ? '*' : ''}`"
                :placeholder="field.placeholder || `Masukkan ${field.label.toLowerCase()}`"
                :rules="field.required ? [requiredValidator] : []"
              />

              <!-- Tipe Angka / Tahun -->
              <AppTextField
                v-else-if="field.type === 'number'"
                v-model.number="template_values[field.key]"
                type="number"
                :label="`${field.label}${field.required ? '*' : ''}`"
                :placeholder="field.placeholder || '0'"
                :rules="field.required ? [requiredValidator] : []"
              />

              <!-- Tipe Tanggal -->
              <AppDateTimePicker
                v-else-if="field.type === 'date'"
                v-model="template_values[field.key]"
                :label="`${field.label}${field.required ? '*' : ''}`"
                :rules="field.required ? [requiredValidator] : []"
              />

              <!-- Tipe Pilihan (Select) -->
              <AppSelect
                v-else-if="field.type === 'select'"
                v-model="template_values[field.key]"
                :label="`${field.label}${field.required ? '*' : ''}`"
                :items="field.options || []"
                :rules="field.required ? [requiredValidator] : []"
              />

              <!-- Tipe Textarea -->
              <AppTextarea
                v-else-if="field.type === 'textarea'"
                v-model="template_values[field.key]"
                rows="3"
                :label="`${field.label}${field.required ? '*' : ''}`"
                :placeholder="field.placeholder || `Tuliskan ${field.label.toLowerCase()}`"
                :rules="field.required ? [requiredValidator] : []"
              />
            </VCol>
          </VRow>
        </div>

        <!-- SEKSI 3B: KONSIDERANS MANUAL (Jika Mode Manual) -->
        <div
          v-if="submissionMode === 'manual'"
          class="mt-8"
        >
          <div class="mb-4">
            <h3 class="text-h6 font-weight-bold">
              Klausul Hukum Naskah Dinas (Manual)
            </h3>
            <p class="text-body-2 text-medium-emphasis">
              Tuliskan poin-poin konsiderans Menimbang, Mengingat, dan Menetapkan secara mandiri.
            </p>
          </div>

          <!-- Menimbang -->
          <section class="border-s-md ps-5 mt-6">
            <VRow
              v-for="(item, i) in list_consider"
              :key="i"
            >
              <VCol cols="11">
                <VTextarea
                  v-model="list_consider[i]"
                  rows="2"
                  placeholder="......."
                  :label="`${i + 1} . Menimbang*`"
                  :prefix="`${i + 1} .`"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                v-if="list_consider?.length > 1"
                cols="1"
              >
                <div class="d-flex">
                  <IconBtn
                    icon="tabler-trash"
                    color="error"
                    @click="handleSlice('consider', i)"
                  />
                </div>
              </VCol>
            </VRow>
               
            <VBtn
              class="mt-3"
              variant="tonal"
              size="small"
              @click="handleAdd('consider')"
            >
              <VIcon
                start
                icon="tabler-plus"
              />
              Tambah Menimbang
            </VBtn>
          </section>

          <!-- Mengingat -->
          <section class="border-s-md ps-5 mt-8">
            <VRow
              v-for="(item, i) in list_observe"
              :key="i"
            >
              <VCol cols="11">
                <VTextarea
                  v-model="list_observe[i]"
                  rows="2"
                  placeholder="......."
                  :label="`${i + 1} . Mengingat*`"
                  :prefix="`${i + 1} .`"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                v-if="list_observe?.length > 1"
                cols="1"
              >
                <div class="d-flex">
                  <IconBtn
                    icon="tabler-trash"
                    color="error"
                    @click="handleSlice('observe', i)"
                  />
                </div>
              </VCol>
            </VRow>
               
            <VBtn
              class="mt-3"
              variant="tonal"
              size="small"
              @click="handleAdd('observe')"
            >
              <VIcon
                start
                icon="tabler-plus"
              />
              Tambah Mengingat
            </VBtn>
          </section>

          <!-- Menetapkan -->
          <section class="border-s-md ps-5 mt-8">
            <VRow
              v-for="(item, i) in list_decide"
              :key="i"
            >
              <VCol cols="11">
                <VTextarea
                  v-model="list_decide[i]"
                  rows="2"
                  placeholder="......."
                  :label="`${i + 1} . Menetapkan*`"
                  :prefix="`${i + 1} .`"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                v-if="list_decide?.length > 1"
                cols="1"
              >
                <div class="d-flex">
                  <IconBtn
                    icon="tabler-trash"
                    color="error"
                    @click="handleSlice('decide', i)"
                  />
                </div>
              </VCol>
            </VRow>
               
            <VBtn
              class="mt-3"
              variant="tonal"
              size="small"
              @click="handleAdd('decide')"
            >
              <VIcon
                start
                icon="tabler-plus"
              />
              Tambah Menetapkan
            </VBtn>
          </section>
        </div>
      </VCardText>

      <!-- SEKSI 4: PENERIMA / DISPOSISI / PIHAK TERKAIT -->
      <VCardText class="pt-0">
        <VDivider class="my-6" />

        <div class="mb-4">
          <h3 class="text-h6 font-weight-bold">
            Pihak Terkait & Disposisi
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            Pilih minimal salah satu pihak (Pegawai, Unit, atau Group) yang terkait dengan keputusan ini.
          </p>
        </div>

        <VExpansionPanels
          v-model="panel"
          multiple
        >
          <AppExpansionPanel
            :title="`Pilih Pegawai (${users?.length || 0})`"
            class="px-0"
          >
            <TableSelectUser v-model="users" />
          </AppExpansionPanel>
          
          <AppExpansionPanel
            :title="`Pilih Unit (${units?.length || 0})`"
            class="px-0"
          >
            <TableSelectUnit v-model="units" />
          </AppExpansionPanel> 
         
          <AppExpansionPanel
            :title="`Pilih Group (${groups?.length || 0})`"
            class="px-0"
          >
            <TableSelectGroup v-model="groups" />
          </AppExpansionPanel>
        </VExpansionPanels>
      </VCardText>
    </VCard>
  </VForm>
</template>

<script setup>
const store = useVuex()
const router = useRouter()
const route = useRoute()

const ref_form = ref()
const submission_id = ref(route.query.submission_id)
const panel = ref([0])

// Mode: 'template' atau 'manual'
const submissionMode = ref('template')

const handleClose = () => router.push('/submission')

// Template store integration
const loadingTemplates = computed(() => store.state.template?.loading?.templates || false)
const templates = computed(() => store.state.template?.templates || [])

const selectedTemplate = computed(() => {
  if (!template_id.value) return null
  return templates.value.find(t => t.id === template_id.value) || null
})

const selectTemplate = item => {
  template_id.value = item.id
  if (item.type && !type.value) {
    type.value = item.type
  }
}

const handleAdd = params => {
  switch (params) {
  case "consider":
    list_consider.value.push("")
    break
  case "observe":
    list_observe.value.push("")
    break
  case "decide":
    list_decide.value.push("")
    break
  }
}

const handleSlice = (params, index) => {
  switch (params) {
  case "consider":
    list_consider.value.splice(index, 1)
    break
  case "observe":
    list_observe.value.splice(index, 1)
    break
  case "decide":
    list_decide.value.splice(index, 1)
    break
  }
}

const validateRecipient = () => {
  if ((!users.value || !users.value.length) &&
      (!units.value || !units.value.length) &&
      (!groups.value || !groups.value.length)) {
    toast.error("Pilih minimal satu Pegawai, Unit, atau Group.")
    return false
  }
  return true
}

const onPosted = async () => {
  const { valid } = await ref_form.value.validate()
  if (!valid) return
  if (!validateRecipient()) return

  store.commit('submission/SET_FORM', {
    key: 'status',
    value: 'POSTED',
  })

  handleSubmit()
}

const handleSubmit = async () => {
  const { valid } = await ref_form.value.validate()
  if (!valid) return
  if (!validateRecipient()) return

  if (submission_id.value) {
    store.dispatch('submission/Update', submission_id.value).then(res => {
      if (res) handleClose()
    })
  } else {
    store.dispatch('submission/Create').then(res => {
      if (res) handleClose()
    })
  }
}

const loading = computed(() => store.state.submission.loading.form)

const title = computed({
  get: () => store.state.submission.form.title,
  set: value => store.commit('submission/SET_FORM', {
    key: 'title',
    value,
  }),
})

const status = computed({
  get: () => store.state.submission.form.status,
  set: value => store.commit('submission/SET_FORM', {
    key: 'status',
    value,
  }),
})

const type = computed({
  get: () => store.state.submission.form.type,
  set: value => store.commit('submission/SET_FORM', {
    key: 'type',
    value,
  }),
})

const template_id = computed({
  get: () => store.state.submission.form.template_id,
  set: value => store.commit('submission/SET_FORM', {
    key: 'template_id',
    value,
  }),
})

const template_values = computed({
  get: () => store.state.submission.form.template_values || {},
  set: value => store.commit('submission/SET_FORM', {
    key: 'template_values',
    value,
  }),
})

const is_attachment = computed({
  get: () => store.state.submission.form.is_attachment,
  set: value => store.commit('submission/SET_FORM', {
    key: 'is_attachment',
    value,
  }),
})

const filepath_attachment = computed({
  get: () => store.state.submission.form.filepath_attachment,
  set: value => store.commit('submission/SET_FORM', {
    key: 'filepath_attachment',
    value,
  }),
})

const pickup_plan = computed({
  get: () => store.state.submission.form.pickup_plan,
  set: value => store.commit('submission/SET_FORM', {
    key: 'pickup_plan',
    value,
  }),
})

const list_consider = computed({
  get: () => store.state.submission.form.list_consider,
  set: value => store.commit('submission/SET_FORM', {
    key: 'list_consider',
    value,
  }),
})

const list_observe = computed({
  get: () => store.state.submission.form.list_observe,
  set: value => store.commit('submission/SET_FORM', {
    key: 'list_observe',
    value,
  }),
})

const list_decide = computed({
  get: () => store.state.submission.form.list_decide,
  set: value => store.commit('submission/SET_FORM', {
    key: 'list_decide',
    value,
  }),
})

const groups = computed({
  get: () => store.state.submission.form.groups,
  set: value => store.commit('submission/SET_FORM', {
    key: 'groups',
    value,
  }),
})

const units = computed({
  get: () => store.state.submission.form.units,
  set: value => store.commit('submission/SET_FORM', {
    key: 'units',
    value,
  }),
})

const users = computed({
  get: () => store.state.submission.form.users,
  set: value => store.commit('submission/SET_FORM', {
    key: 'users',
    value,
  }),
})

onMounted(async () => {
  // Ambil daftar template yang aktif
  const tpls = await store.dispatch('template/FetchTemplates', { is_active: true })

  if (submission_id.value) {
    await store.dispatch('submission/SetFormUpdate', submission_id.value)
    if (store.state.submission.form.template_id) {
      submissionMode.value = 'template'
    } else {
      submissionMode.value = 'manual'
    }
  } else if (tpls && tpls.length > 0) {
    // Pilih template pertama secara default jika ada
    selectTemplate(tpls[0])
  }
})
</script>

<style lang="scss" scoped>
.sticky-header {
  position: sticky;
  z-index: 9;
  inset-block-end: 0;
  inset-block-start: 125px;
  transition: all 0.3s ease-in-out;
}

.hover-shadow {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
