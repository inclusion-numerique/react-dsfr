import { isBrowser } from "./tools/isBrowser";
import type { ColorScheme } from "./darkMode";
import { startObservingColorSchemeHtmlAttribute, data_fr_theme, data_fr_scheme } from "./darkMode";
import { assert } from "tsafe/assert";
import { symToStr } from "tsafe/symToStr";
import { setLangToUseIfProviderNotUsed } from "./i18n";

export type Params = {
    defaultColorScheme: ColorScheme | "system";
    /** If not specified it will fall back to browser preference */
    langIfNoProvider?: string;
    /** Default: false */
    verbose?: boolean;
};

let isStarted = false;

export async function startDsfrReact(params: Params) {
    const { defaultColorScheme, verbose = false, langIfNoProvider } = params;

    assert(
        isBrowser,
        [
            `${symToStr({ startDsfrReact })}() is not supposed`,
            `to be run on the backed, only in the browser`
        ].join(" ")
    );

    if (isStarted) {
        return;
    }

    isStarted = true;

    if (langIfNoProvider !== undefined) {
        setLangToUseIfProviderNotUsed(langIfNoProvider);
    }

    const isNextJs = (window as any).__NEXT_DATA__ !== undefined;

    const isNextJsDevEnvironnement =
        isNextJs && (window as any).__NEXT_DATA__.buildId === "development";

    set_html_color_scheme_attributes: {
        if (document.documentElement.getAttribute(data_fr_theme) !== null) {
            //NOTE: Is has been set by SSR
            break set_html_color_scheme_attributes;
        }

        document.documentElement.setAttribute(data_fr_scheme, defaultColorScheme);

        if (isNextJsDevEnvironnement) {
            break set_html_color_scheme_attributes;
        }

        document.documentElement.setAttribute(
            data_fr_theme,
            (() => {
                const colorSchemeReadFromLocalStorage = localStorage.getItem("scheme");

                const colorSchemeOrSystem: ColorScheme | "system" =
                    (() => {
                        switch (colorSchemeReadFromLocalStorage) {
                            case "light":
                            case "dark":
                            case "system":
                                return colorSchemeReadFromLocalStorage;
                            default:
                                return null;
                        }
                    })() ?? defaultColorScheme;

                return colorSchemeOrSystem !== "system"
                    ? colorSchemeOrSystem
                    : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
            })()
        );
    }

    startObservingColorSchemeHtmlAttribute();

    (window as any).dsfr = { verbose, "mode": "manual" };

    await import("../dsfr/dsfr.module" as any);

    console.log("disabled");

    if (!isNextJs) {
        (window as any).dsfr.start();
    }
}
