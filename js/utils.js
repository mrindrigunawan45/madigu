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