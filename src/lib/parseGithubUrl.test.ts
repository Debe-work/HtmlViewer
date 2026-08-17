import { describe, expect, it } from 'vitest'
import {
  fileName,
  githubWebUrl,
  isHtmlPath,
  isMarkdownPath,
  isPreviewablePath,
  parseGithubUrl,
  parentPath,
  repoHref,
  splitRefAndPath,
} from './parseGithubUrl.ts'

describe('parseGithubUrl', () => {
  it('parses owner/repo shorthand', () => {
    expect(parseGithubUrl('twbs/bootstrap')).toEqual({
      owner: 'twbs',
      repo: 'bootstrap',
      view: 'tree',
    })
  })

  it('parses a blob URL to preview for html files', () => {
    expect(
      parseGithubUrl('https://github.com/twbs/bootstrap/blob/v5.3.3/site/src/index.html'),
    ).toEqual({
      owner: 'twbs',
      repo: 'bootstrap',
      ref: 'v5.3.3',
      path: 'site/src/index.html',
      view: 'preview',
    })
  })

  it('parses a blob URL to preview for markdown files', () => {
    expect(
      parseGithubUrl('https://github.com/facebook/react/blob/main/README.md'),
    ).toEqual({
      owner: 'facebook',
      repo: 'react',
      ref: 'main',
      path: 'README.md',
      view: 'preview',
    })
  })

  it('parses a tree URL', () => {
    expect(parseGithubUrl('https://github.com/facebook/react/tree/main/fixtures')).toEqual({
      owner: 'facebook',
      repo: 'react',
      ref: 'main',
      path: 'fixtures',
      view: 'tree',
    })
  })

  it('parses raw.githubusercontent.com URLs from any repo', () => {
    expect(
      parseGithubUrl(
        'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/html/index.md',
      ),
    ).toEqual({
      owner: 'mdn',
      repo: 'content',
      ref: 'main',
      path: 'files/en-us/web/html/index.md',
      view: 'preview',
    })
  })

  it('returns null for non-github hosts', () => {
    expect(parseGithubUrl('https://gitlab.com/foo/bar/-/blob/main/index.html')).toBeNull()
  })

  it('parses gist.github.com HTML files', () => {
    expect(
      parseGithubUrl('https://gist.github.com/niutech/2f7c5e78d50ca5f42804#file-index-html'),
    ).toEqual({
      owner: 'niutech',
      repo: '2f7c5e78d50ca5f42804',
      path: 'index.html',
      view: 'preview',
      gist: true,
    })
  })

  it('parses gist.github.com Markdown files', () => {
    expect(
      parseGithubUrl('https://gist.github.com/octocat/2f7c5e78d50ca5f42804#file-readme-md'),
    ).toEqual({
      owner: 'octocat',
      repo: '2f7c5e78d50ca5f42804',
      path: 'readme.md',
      view: 'preview',
      gist: true,
    })
  })

  it('parses gist.githubusercontent.com raw files', () => {
    expect(
      parseGithubUrl('https://gist.githubusercontent.com/octocat/abc123/raw/hello.html'),
    ).toEqual({
      owner: 'octocat',
      repo: 'abc123',
      path: 'hello.html',
      view: 'preview',
      gist: true,
    })
  })
})

describe('path helpers', () => {
  it('detects html and markdown paths', () => {
    expect(isHtmlPath('docs/index.html')).toBe(true)
    expect(isHtmlPath('docs/page.HTM')).toBe(true)
    expect(isHtmlPath('src/app.tsx')).toBe(false)
    expect(isMarkdownPath('README.md')).toBe(true)
    expect(isMarkdownPath('notes.MARKDOWN')).toBe(true)
    expect(isMarkdownPath('src/app.tsx')).toBe(false)
    expect(isPreviewablePath('docs/index.html')).toBe(true)
    expect(isPreviewablePath('README.md')).toBe(true)
    expect(isPreviewablePath('src/app.tsx')).toBe(false)
  })

  it('builds in-app and github urls', () => {
    expect(repoHref({ owner: 'twbs', repo: 'bootstrap', ref: 'main', path: 'index.html', view: 'preview' })).toBe(
      '/r/twbs/bootstrap?ref=main&path=index.html&view=preview',
    )
    expect(
      repoHref({ owner: 'octocat', repo: 'abc123', path: 'hello.html', view: 'preview', gist: true }),
    ).toBe('/gist/abc123?file=hello.html&view=preview')
    expect(
      githubWebUrl({ owner: 'twbs', repo: 'bootstrap', ref: 'main', path: 'index.html', view: 'preview' }),
    ).toBe('https://github.com/twbs/bootstrap/blob/main/index.html')
  })

  it('computes parent paths', () => {
    expect(parentPath('docs/guide/index.html')).toBe('docs/guide')
    expect(parentPath('index.html')).toBe('')
    expect(fileName('docs/guide/index.html')).toBe('index.html')
  })

  it('splits slashy branch names using known branches', () => {
    const split = splitRefAndPath('cursor/github-html-viewer-1ed8/examples/index.html', [
      'main',
      'cursor/github-html-viewer-1ed8',
    ])
    expect(split).toEqual({
      ref: 'cursor/github-html-viewer-1ed8',
      path: 'examples/index.html',
    })
  })
})
