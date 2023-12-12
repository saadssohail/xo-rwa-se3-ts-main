
import { UrlLoaderService } from './services/url-loader.service.js'
import { Command } from 'commander'

interface AppParameters {
  url: string
  word: string
  depth: number
}

export const DEFAULT_URL = 'https://www.kayako.com'
export const DEFAULT_WORD = 'kayako'
export const DEFAULT_DEPTH = '2'

export class App {
  /* istanbul ignore next */
  constructor (private readonly urlLoader: UrlLoaderService, private readonly command = new Command()) {
  }

  async run (): Promise<void> {
    const appParameters = this.parseCli()

    await this.process(appParameters)
  }

  async process (appParameters: AppParameters): Promise<void> {
    let count = 0
    const visited = new Set<string>()
    const formattedBaseUrl = this.formatUrl(appParameters.url)
    const queue: Array<{ url: string, level: number }> = [{ url: formattedBaseUrl, level: 0 }]

    while (queue.length > 0) {
      const dequeued = queue.shift()

      if (dequeued == null) {
        continue
      }

      const { url, level } = dequeued

      if (level > appParameters.depth || visited.has(url)) continue

      visited.add(url)
      const { text, links } = await this.urlLoader.loadUrlTextAndLinks(url)
      count += (text.toLocaleLowerCase().match(new RegExp(appParameters.word, 'ig')) ?? []).length
      if (level < appParameters.depth) {
        links.forEach(link => {
          const formattedUrl = this.formatUrl(link)
          if (!visited.has(formattedUrl) && formattedUrl.includes(appParameters.url)) {
            queue.push({ url: formattedUrl, level: level + 1 })
          }
        })
      }
    }
    console.log(`Found ${count} instances of '${appParameters.word}' at level ${appParameters.depth} of the page: ${appParameters.url}`)
  }

  formatUrl (url: string): string {
    return url.split('#')[0].replace(/\/$/, '')
  }

  parseCli (argv: readonly string[] = process.argv): AppParameters {
    this.command
      .requiredOption('-u, --url <url>', 'URL to load', DEFAULT_URL)
      .requiredOption('-w, --word <word>', 'Word to search for', DEFAULT_WORD)
      .requiredOption('-d, --depth <depth>', 'Depth to search', DEFAULT_DEPTH)

    this.command.parse(argv)
    const options = this.command.opts()

    return { url: options.url, word: options.word, depth: parseInt(options.depth) }
  }
}
