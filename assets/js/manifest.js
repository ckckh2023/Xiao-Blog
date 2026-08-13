/**
 * Wiki 目录清单
 * ------------------------------------------------------------------
 * 每个条目对应 /docs 下的一个文件夹，文件夹内 index.html 自组装为内容页。
 *
 * 路径基准（由各页面在引入本脚本前设置）：
 *   window.SITE_ROOT  站点根的相对路径  （根页面 ''、docs 下 '../'、docs/xxx 下 '../../'）
 *   window.WIKI_ROOT  docs 根的相对路径  （根页面 'docs/'、docs 下 './'、docs/xxx 下 '../'）
 * 未设置时回退到绝对路径 '/' 与 '/docs/'，兼容 GitHub Pages 与本地 HTTP 服务器。
 *
 * 新增 wiki 条目只需：
 *   1) 在 /docs 下新建文件夹并写 index.html
 *   2) 在下方对应分组里追加一条 { id, title, emoji, desc, tags, updated }
 *   id 必须与文件夹名一致
 */
(function () {
  var SITE_ROOT = window.SITE_ROOT || '/';
  var WIKI_ROOT = window.WIKI_ROOT || '/docs/';

  window.WIKI_MANIFEST = {
    siteRoot: SITE_ROOT,
    wikiRoot: WIKI_ROOT,
    groups: [
      {
        title: '项目档案',
        items: [
          {
            id: 'trashgo',
            title: 'TrashGo 智识助手',
            emoji: '🗑️',
            desc: '基于 Qt 6 + OpenCV 的桌面端 AI 垃圾分类识别应用，4 大类 120 种细分类别，本地 ONNX 与百度云双引擎。',
            tags: ['C++', 'Qt 6', 'OpenCV', 'ONNX'],
            updated: '2026-08-12',
            repo: 'ckckh2023/TrashGo_AIRecognition',
            stars: 14,
            forks: 2,
            lang: 'C++',
            langColor: '#f34b7d',
            homepage: 'TrashGo_AIRecognition/'
          },
          {
            id: 'btir',
            title: 'BTIR 脑肿瘤 MRI 分析',
            emoji: '🧠',
            desc: '面向临床与科研的脑肿瘤 MRI 一站式分析平台，ViT 分类 + SuperLightNet 3D 分割，多用户隔离与异步任务队列。',
            tags: ['Python', 'PyTorch', 'FastAPI', 'WebGL2'],
            updated: '2026-08-13',
            repo: 'ckckh2023/BTIR-BrainTumor-ImageRecognition',
            stars: 5,
            forks: 0,
            lang: 'Python',
            langColor: '#3572A5',
            homepage: 'BTIR-BrainTumor-ImageRecognition/'
          }
        ]
      },
      {
        title: '技术笔记',
        items: [
          {
            id: 'notes',
            title: '开发笔记',
            emoji: '📝',
            desc: '项目开发过程中的踩坑记录、架构选型思考与工程实践小结。',
            tags: ['随笔', '工程', '架构'],
            updated: '2026-08-13'
          }
        ]
      }
    ]
  };

  // 拍平所有条目，预计算相对 URL
  window.WIKI_MANIFEST.allItems = window.WIKI_MANIFEST.groups.reduce(function (acc, g) {
    g.items.forEach(function (it) {
      it.group = g.title;
      it.url = WIKI_ROOT + it.id + '/';
      if (it.homepage) it.homepage = SITE_ROOT + it.homepage;
      acc.push(it);
    });
    return acc;
  }, []);
})();
