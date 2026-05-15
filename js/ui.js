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

    tabs.forEach(tab => {
      tab.classList.remove('active')
    })

    document
      .getElementById(target)
      .classList.add('active')

    document.getElementById('header-title').innerText =
      item.innerText

    sidebar.classList.remove('active')
    overlay.classList.remove('active')

  })

})

const logoutBtn = document.getElementById('logoutBtn')

logoutBtn.addEventListener('click', () => {

  localStorage.clear()

  window.location.href = 'index.html'

})