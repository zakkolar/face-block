import Vue from 'vue'
import Router from 'vue-router'
import Blocker from "../components/Blocker";
import StickerEditor from "../components/StickerEditor";


Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Blocker',
      component: Blocker
    },
    {
      path: '/stickers',
      name: 'Stickers',
      component: StickerEditor
    }
  ]
})
