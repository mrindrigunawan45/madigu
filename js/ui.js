console.log('UI.JS LOADED')
const sidebar = document.getElementById('sidebar')
const overlay = document.getElementById('overlay')
const menuBtn = document.getElementById('menuBtn')

menuBtn.addEventListener('click', () => {

  sidebar.classList.toggle('active')
  overlay.classList.toggle('active')

})

overlay.addEventListener('click', () => {

  sidebar.classList.remove('active')
  overlay.classList.remove('active')

})

const menuItems = document.querySelectorAll('.menu-item[data-tab]')
const tabs = document.querySelectorAll('.tab')

menuItems.forEach(item => {

  item.addEventListener('click', () => {

    menuItems.forEach(menu => {
      menu.classList.remove('active')
    })

    item.classList.add('active')

    const target = item.dataset.tab

    console.log('TARGET TAB:', target)

    // RESET INPUT NILAI
    const mapelNilai =
      document.getElementById('mapel-nilai')

    const jenisNilai =
      document.getElementById('jenis-nilai')

    const kelasNilai =
      document.getElementById('kelas-nilai')

    const listSiswaNilai =
      document.getElementById('list-siswa-nilai')

    if (
      mapelNilai &&
      jenisNilai &&
      kelasNilai &&
      listSiswaNilai
    ) {

      mapelNilai.selectedIndex = 0
      jenisNilai.selectedIndex = 0
      kelasNilai.selectedIndex = 0

      listSiswaNilai.innerHTML = ''

    }

    tabs.forEach(tab => {
      tab.classList.remove('active')
    })

    document
      .getElementById(target)
      .classList.add('active')

    const headerTitle =
      document.getElementById('header-title')

    if (headerTitle) {

      headerTitle.innerText =
        item.innerText

    }

    sidebar.classList.remove('active')
    overlay.classList.remove('active')

  })

})

const logoutBtn =
  document.getElementById('logoutBtn')

logoutBtn.addEventListener('click', () => {

  localStorage.clear()

  window.location.href =
    'index.html'

})