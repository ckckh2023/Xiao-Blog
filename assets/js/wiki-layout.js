/**
 * Wiki 共享布局
 * ------------------------------------------------------------------
 * 提供 renderWikiSidebar(selector, activeId)：
 *   在指定容器用 Vue 渲染左侧分组导航，高亮 activeId 条目
 *   activeId 为 null 时高亮"目录首页"
 * 依赖：Vue 3 CDN + manifest.js（先引入）
 */
(function () {
  var manifest = window.WIKI_MANIFEST;
  if (!manifest) {
    console.error('[wiki-layout] manifest.js 未加载');
    return;
  }
  var Vue = window.Vue;
  if (!Vue) {
    console.error('[wiki-layout] Vue 未加载');
    return;
  }

  var SidebarRoot = {
    props: { activeId: { type: String, default: null } },
    setup: function () {
      var wikiRoot = manifest.wikiRoot;
      var groups = manifest.groups;
      return { wikiRoot: wikiRoot, groups: groups };
    },
    template: [
      '<a class="wiki-sidebar-home" :class="{ active: activeId === null }" :href="wikiRoot">',
      '  <span class="emoji">📚</span> Wiki 目录',
      '</a>',
      '<div class="wiki-sidebar-group" v-for="g in groups" :key="g.title">',
      '  <p class="wiki-sidebar-group-title">{{ g.title }}</p>',
      '  <a v-for="it in g.items" :key="it.id"',
      '     class="wiki-sidebar-link"',
      '     :class="{ active: activeId === it.id }"',
      '     :href="it.url">',
      '    <span class="emoji">{{ it.emoji }}</span>',
      '    <span>{{ it.title }}</span>',
      '  </a>',
      '</div>'
    ].join('\n')
  };

  window.renderWikiSidebar = function (selector, activeId) {
    var el = document.querySelector(selector);
    if (!el) {
      console.error('[wiki-layout] 容器不存在:', selector);
      return;
    }
    var app = Vue.createApp(SidebarRoot, { activeId: activeId });
    app.mount(el);
    return app;
  };

  /**
   * 渲染 wiki 目录首页的分组卡片网格
   * selector: 容器
   */
  var CatalogRoot = {
    setup: function () {
      var groups = manifest.groups;
      return { groups: groups };
    },
    template: [
      '<div class="wiki-catalog-group" v-for="g in groups" :key="g.title">',
      '  <h2>{{ g.title }}</h2>',
      '  <div class="wiki-catalog-grid">',
      '    <a v-for="it in g.items" :key="it.id" class="wiki-catalog-card" :href="it.url">',
      '      <div class="wiki-catalog-card-head">',
      '        <span class="wiki-catalog-card-emoji">{{ it.emoji }}</span>',
      '        <span class="wiki-catalog-card-title">{{ it.title }}</span>',
      '      </div>',
      '      <p class="wiki-catalog-card-desc">{{ it.desc }}</p>',
      '    </a>',
      '  </div>',
      '</div>'
    ].join('\n')
  };

  window.renderWikiCatalog = function (selector) {
    var el = document.querySelector(selector);
    if (!el) {
      console.error('[wiki-layout] 容器不存在:', selector);
      return;
    }
    var app = Vue.createApp(CatalogRoot);
    app.mount(el);
    return app;
  };
})();
