import { metrics } from "@/lib/data";
import { AUTHOR, DATASET_URL, GITHUB_URL, NOTEBOOK_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 text-sm text-ink-3 sm:px-8 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold uppercase text-ink">
            Shot<span className="text-accent">Quality</span>
          </p>
          <p>
            Built by {AUTHOR}. Data:{" "}
            <a className="link" href={DATASET_URL}>
              NBA shot logs on Kaggle
            </a>
            , originally SportVU tracking via NBA.com. Not affiliated with the NBA.
          </p>
          <p className="font-mono text-[11px]">Numbers generated {metrics.generated} from the pinned export script.</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 md:flex-col md:text-right">
          <li>
            <a className="link hover:text-ink" href={GITHUB_URL}>
              Source code
            </a>
          </li>
          <li>
            <a className="link hover:text-ink" href={NOTEBOOK_URL}>
              Notebook
            </a>
          </li>
          <li>
            <a className="link hover:text-ink" href="#top">
              Back to top
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
