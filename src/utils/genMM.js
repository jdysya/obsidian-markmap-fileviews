const { Transformer } = require('markmap-lib')
const { Markmap } = require('markmap-view')
import { Toolbar } from 'markmap-toolbar';
const { fillTemplate } = require('markmap-render')
const afterTransform = (app, ob)=> {
  const Poper = require('./poper.js')(app, ob)
  return funcBtns = (dom, path)=> dom.querySelectorAll('button[data-k]').forEach(btn=> {
    btn.onclick = async evt=> {
      const linkpath = btn.ariaLabel
      if (btn.dataset.k == 'fd') {
        const folder = app.vault.getFolderByPath(linkpath)
        app.internalPlugins.getEnabledPluginById('file-explorer').revealInFolder(folder)
      }
      else new Poper(evt).openLink(linkpath, path)
    }
  })
}
const mmJson = require('./svg2img/mmJson.js')
const svg2img = require('./svg2img/svg2img.js')
module.exports = (app, ob)=> {
  const funcBtns = afterTransform(app, ob)
  const customBar = (mm, htmlText, sourcePath, originalMarkdown)=> {
    const bar = Toolbar.create(mm); bar.setBrand(!1) // hide markmap logo & url
    bar.register({
      id: 'export-as-img', content: '', title: '导出PNG',
      onClick: async ()=> {
        await mm.fit()
        const svg = bar.markmap.svg['_groups'][0][0]
        const img = await svg2img(svg)
        createEl('a', {attr: {
          download: `.${mmJson.imgAbbr}`, href: img.src,
        }}).click()
      },
    })
    
    // 优化导出HTML按钮
    bar.register({
      id: 'export-as-html', content: '', title: '导出HTML',
      onClick: async ()=> {
        await mm.fit()
        exportHtml(mm, sourcePath, originalMarkdown)
      },
    })
    
    // 添加全屏按钮
    bar.register({
      id: 'fullscreen', content: '', title: '全屏显示',
      onClick: async ()=> {
        const leaf = app.workspace.getLeaf('split')
        await leaf.setViewState({
          type: 'mm-block-view',
          state: {
            sourcePath: sourcePath,
            htmlContent: htmlText,
            originalMarkdown: originalMarkdown
          }
        })
      },
    })

    bar.setItems([...Toolbar.defaultItems, 'export-as-img', 'export-as-html', 'fullscreen'])
    const barEl = bar.render()
    ob.setIcon(barEl.children[4], 'download')
    barEl.children[4].firstChild.setCssProps({width: '16px', height: '20px'})
    
    // 设置HTML导出按钮图标
    ob.setIcon(barEl.children[5], 'file-code')
    barEl.children[5].firstChild.setCssProps({width: '16px', height: '20px'})
    
    // 设置全屏按钮图标
    ob.setIcon(barEl.children[6], 'maximize-2')
    barEl.children[6].firstChild.setCssProps({width: '16px', height: '20px'})
    
    return barEl
  }
  
  // 优化导出HTML功能
  const exportHtml = (mm, sourcePath, originalMarkdown) => {
    try {
      // 获取文件名（不包含路径和扩展名）
      const filename = sourcePath ? sourcePath.split('/').pop().replace(/\.md$/, '') : 'markmap'
      
      // 定义资源，使用CDN链接确保离线可用
      const assets = {
        scripts: [
          { type: 'script', data: { src: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js' } },
          { type: 'script', data: { src: 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.10/dist/browser/index.min.js' } },
          { type: 'script', data: { src: 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.10/dist/index.min.js' } },
          { type: 'script', data: { src: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js' } }
        ],
        styles: [
          { type: 'style', data: { href: 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.10/dist/style.css' } },
          { type: 'style', data: { href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css' } }
        ]
      }
      // 使用markmap-render的fillTemplate生成完整HTML
      const html = fillTemplate(mm.state.data, assets, {
        jsonOptions: { 
          colorFreezeLevel: 2,
          color: mmJson.opts?.color || d3.scaleOrdinal(d3.schemeCategory10),
          duration: mmJson.opts?.duration || 500,
          maxWidth: mmJson.opts?.maxWidth || 0
        },
        title: filename,
        toolbar: true
      });
      
      // 创建下载链接
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = createEl('a', {
        attr: {
          href: url,
          download: `${filename}-思维导图.html`
        }
      });
      a.click();
      
      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // 显示成功通知
      if (app.notice) {
        app.notice('思维导图HTML已成功导出');
      }
    } catch (error) {
      console.error('导出HTML时出错:', error);
      if (app.notice) {
        app.notice('导出HTML失败: ' + error.message);
      }
    }
  }
  
  const genMM = async (
    wrapper, htmlText, sourcePath, {printHeight, isEditModeOpenInReading, originalMarkdown}
  )=> {
    wrapper.empty()
    const svg = wrapper.createSvg('svg')
    const lib = new Transformer(), { root } = lib.transform(htmlText)
    const mm = Markmap.create(svg, mmJson.opts)
    await mm.setData(root)
    funcBtns(svg, sourcePath)
    if (!isEditModeOpenInReading) await mm.fit()
    if (printHeight) {
      await mm.fit()
      // seems markmap@0.18 requires calling fit() again before exporting a PDF
      await svg2img(svg, printHeight)
    }
    else wrapper.append(customBar(mm, htmlText, sourcePath, originalMarkdown))
  }
  const genMM2 = (ob.debounce)(genMM)
  return { genMM, genMM2 }
}