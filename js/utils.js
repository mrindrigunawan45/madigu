export function showToast(message, type = 'success') {

  const toast = document.getElementById('toast')

  toast.innerText = message
  toast.className = `toast show ${type}`

  setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

export function showLoading() {
  document.getElementById('loading').classList.remove('hidden')
}

export function hideLoading() {
  document.getElementById('loading').classList.add('hidden')
}


// RESET FORM
export function resetForm(excludeIds = []) {

  document.querySelectorAll('input, textarea, select').forEach(el => {

    if (!excludeIds.includes(el.id)) {

      if (el.type === 'checkbox' || el.type === 'radio') {

        el.checked = false

      } else {

        el.value = ''

      }

    }

  })

}


// CLEAR REKAP
export function clearRekap() {

  const nilaiBody = document.getElementById('rekapNilaiBody')

  if (nilaiBody) {
    nilaiBody.innerHTML = ''
  }

  const absenBody = document.getElementById('rekapAbsenBody')

  if (absenBody) {
    absenBody.innerHTML = ''
  }

}
export function clearElement(id) {

  const el =
    document.getElementById(id)

  if (el) {

    el.innerHTML = ''

  }

}