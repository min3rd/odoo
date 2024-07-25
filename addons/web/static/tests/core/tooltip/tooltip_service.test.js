import { test, expect, getFixture, after } from "@odoo/hoot";
import { App, Component, useState, xml } from "@odoo/owl";
import {
    makeMockEnv,
    mockService,
    mountWithCleanup,
    patchWithCleanup,
} from "@web/../tests/web_test_helpers";
import { advanceTime, animationFrame, runAllTimers } from "@odoo/hoot-mock";
import { hover, leave, pointerDown, pointerUp, queryOne } from "@odoo/hoot-dom";
import { popoverService } from "@web/core/popover/popover_service";
import { MainComponentsContainer } from "@web/core/main_components_container";
import { getTemplate } from "@web/core/templates";
import { _t } from "@web/core/l10n/translation";
import { browser } from "@web/core/browser/browser";

const OPEN_DELAY = 400; // Default opening delay time

test.tags("desktop")("basic rendering", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button class="mybtn" data-tooltip="hello">Action</button>`;
    }

    await mountWithCleanup(MyComponent);
    expect(".o_popover").toHaveCount(0);
    hover(".mybtn");
    expect(".o_popover").toHaveCount(0);

    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("hello");

    leave();
    await animationFrame();
    expect(".o_popover").toHaveCount(0);
});

test.tags("desktop")("basic rendering 2", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<span data-tooltip="hello" class="outer_span"><span class="inner_span">Action</span></span>`;
    }

    await mountWithCleanup(MyComponent);

    expect(".o_popover").toHaveCount(0);
    hover(".inner_span");
    expect(".o_popover").toHaveCount(0);

    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("hello");

    hover(".outer_span");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);

    leave();
    await animationFrame();
    expect(".o_popover").toHaveCount(0);
});

test.tags("desktop")("remove element with opened tooltip", async () => {
    let compState;
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`
            <div>
                <button t-if="state.visible" data-tooltip="hello">Action</button>
            </div>`;
        setup() {
            this.state = useState({ visible: true });
            compState = this.state;
        }
    }

    await mountWithCleanup(MyComponent);

    expect("button").toHaveCount(1);
    expect(".o_popover").toHaveCount(0);
    hover("button");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);

    compState.visible = false;
    await animationFrame();
    expect("button").toHaveCount(0);
    await runAllTimers();
    expect(".o_popover").toHaveCount(0);
});

test.tags("desktop")("rendering with several tooltips", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`
            <div>
                <button class="button_1" data-tooltip="tooltip 1">Action 1</button>
                <button class="button_2" data-tooltip="tooltip 2">Action 2</button>
            </div>`;
    }

    await mountWithCleanup(MyComponent);

    expect(".o_popover").toHaveCount(0);

    hover("button.button_1");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("tooltip 1");

    hover("button.button_2");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("tooltip 2");
});

test.tags("desktop")("positioning", async () => {
    mockService("popover", (...kargs) => {
        const popover = popoverService.start(...kargs);
        return {
            add(...args) {
                const { position } = args[3];
                if (position) {
                    expect.step(`popover added with position: ${position}`);
                } else {
                    expect.step(`popover added with default positioning`);
                }
                return popover.add(...args);
            },
        };
    });

    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`
            <div style="height: 400px; padding: 40px">
                <button class="default" data-tooltip="default">Default</button>
                <button class="top" data-tooltip="top" data-tooltip-position="top">Top</button>
                <button class="right" data-tooltip="right" data-tooltip-position="right">Right</button>
                <button class="bottom" data-tooltip="bottom" data-tooltip-position="bottom">Bottom</button>
                <button class="left" data-tooltip="left" data-tooltip-position="left">Left</button>
            </div>`;
    }

    await mountWithCleanup(MyComponent);

    // default
    hover("button.default");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("default");
    expect.verifySteps(["popover added with default positioning"]);

    // top
    hover("button.top");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("top");
    expect.verifySteps(["popover added with position: top"]);

    // right
    hover("button.right");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("right");
    expect.verifySteps(["popover added with position: right"]);

    // bottom
    hover("button.bottom");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("bottom");
    expect.verifySteps(["popover added with position: bottom"]);

    // left
    hover("button.left");
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("left");
    expect.verifySteps(["popover added with position: left"]);
});

test.tags("desktop")("tooltip with a template, no info", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`
            <button data-tooltip-template="my_tooltip_template">Action</button>
        `;
    }

    class Parent extends Component {
        static props = ["*"];
        static template = xml`
            <div>
                <MyComponent/>
                <MainComponentsContainer />
            </div>`;
        static components = { MyComponent, MainComponentsContainer };
    }

    const env = await makeMockEnv({ tooltip_text: "tooltip" });
    const target = getFixture();
    const app = new App(Parent, {
        env,
        getTemplate,
        test: true,
        translateFn: _t,
        warnIfNoStaticProps: true,
    });

    after(() => app.destroy());
    app.addTemplate("my_tooltip_template", "<i t-esc='env.tooltip_text'/>");
    await app.mount(target);

    expect(".o-tooltip").toHaveCount(0);
    hover("button");
    await runAllTimers();
    expect(".o-tooltip").toHaveCount(1);
    expect(".o-tooltip").toHaveInnerHTML("<i>tooltip</i>");
});

test.tags("desktop")("tooltip with a template and info", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`
            <button
                data-tooltip-template="my_tooltip_template"
                t-att-data-tooltip-info="info">
                Action
            </button>
        `;
        get info() {
            return JSON.stringify({ x: 3, y: "abc" });
        }
    }

    class Parent extends Component {
        static props = ["*"];
        static template = xml`
            <div>
                <MyComponent/>
                <MainComponentsContainer />
            </div>`;
        static components = { MyComponent, MainComponentsContainer };
    }

    const env = await makeMockEnv();
    const target = getFixture();
    const app = new App(Parent, {
        env,
        getTemplate,
        test: true,
        translateFn: _t,
        warnIfNoStaticProps: true,
    });

    after(() => app.destroy());
    app.addTemplate(
        "my_tooltip_template",
        `
    <ul>
        <li>X: <t t-esc="x"/></li>
        <li>Y: <t t-esc="y"/></li>
    </ul>
`
    );
    await app.mount(target);

    expect(".o-tooltip").toHaveCount(0);
    hover("button");
    await runAllTimers();
    expect(".o-tooltip").toHaveCount(1);
    expect(".o-tooltip").toHaveInnerHTML("<ul><li>X: 3</li><li>Y: abc</li></ul>");
});

test.tags("desktop")("empty tooltip, no template", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button t-att-data-tooltip="tooltip">Action</button>`;
        get tooltip() {
            return "";
        }
    }

    await mountWithCleanup(MyComponent);
    expect(".o-tooltip").toHaveCount(0);
    hover("button");
    await runAllTimers();
    expect(".o-tooltip").toHaveCount(0);
});

test.tags("desktop")("tooltip with a delay", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button class="myBtn" data-tooltip="'helpful tooltip'" data-tooltip-delay="2000">Action</button>`;
    }

    await mountWithCleanup(MyComponent);
    expect(".o-tooltip").toHaveCount(0);

    hover("button.myBtn");
    await advanceTime(OPEN_DELAY);
    expect(".o-tooltip").toHaveCount(0);
    await advanceTime(2000 - OPEN_DELAY);
    expect(".o-tooltip").toHaveCount(1);
});

test.tags("desktop")("tooltip does not crash with disappearing target", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button class="mybtn" data-tooltip="hello">Action</button>`;
    }

    await mountWithCleanup(MyComponent);
    expect(".o_popover").toHaveCount(0);

    hover(".mybtn");
    await animationFrame();
    expect(".o_popover").toHaveCount(0);

    // the element disappeared from the DOM during the setTimeout
    queryOne(".mybtn").remove();

    await runAllTimers();
    expect(".o_popover").toHaveCount(0);
});

test.tags("desktop")("tooltip using the mouse with a touch enabled device", async () => {
    // Cannot use mockTouch(), because we don't want hoot to trigger touch events
    patchWithCleanup(browser, {
        ontouchstart: null,
    });

    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button class="mybtn" data-tooltip="hello">Action</button>`;
    }

    await mountWithCleanup(MyComponent);
    expect(".o_popover").toHaveCount(0);

    hover(".mybtn");
    await animationFrame();
    expect(".o_popover").toHaveCount(0);

    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("hello");

    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("hello");

    leave();
    await animationFrame();
    expect(".o_popover").toHaveCount(0);
});

test.tags("mobile")("touch rendering - hold-to-show", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button data-tooltip="hello">Action</button>`;
    }

    await mountWithCleanup(MyComponent);
    expect(".o_popover").toHaveCount(0);
    pointerDown("button");
    await animationFrame();
    expect(".o_popover").toHaveCount(0);

    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("hello");

    pointerUp("button");
    await animationFrame();
    expect(".o_popover").toHaveCount(1);
    await runAllTimers();
    expect(".o_popover").toHaveCount(0);
});

test.tags("mobile")("touch rendering - tap-to-show", async () => {
    class MyComponent extends Component {
        static props = ["*"];
        static template = xml`<button data-tooltip="hello" data-tooltip-touch-tap-to-show="true">Action</button>`;
    }

    await mountWithCleanup(MyComponent);
    expect(".o_popover").toHaveCount(0);
    pointerDown("button[data-tooltip]");
    await animationFrame();
    expect(".o_popover").toHaveCount(0);

    await runAllTimers();
    expect(".o_popover").toHaveCount(1);
    expect(".o_popover").toHaveText("hello");

    pointerUp("button");
    await animationFrame();
    expect(".o_popover").toHaveCount(1);
    await runAllTimers();
    expect(".o_popover").toHaveCount(1);

    pointerDown("button[data-tooltip]");
    await animationFrame();
    expect(".o_popover").toHaveCount(0);
});
