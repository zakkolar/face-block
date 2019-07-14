import Vue from 'vue'
import Router from 'vue-router'
import Blocker from "../components/Blocker";


Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Blocker',
      component: Blocker
    }
  ]
})
