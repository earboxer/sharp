import Vue from 'vue/dist/vue';
import Markdown from '../components/form/fields/markdown/Markdown.vue';

import { MockI18n, MockInjections } from './utils';

import * as Localization from '../mixins/Localization';



describe('markdown-field', () => {

    Vue.component('sharp-markdown', Markdown);
    Vue.use(MockI18n);

    beforeEach(()=>{
        document.body.innerHTML = `
            <div id="app">
                <sharp-markdown :value="value" 
                    :read-only="readOnly" 
                    placeholder="Champ md" 
                    :toolbar="toolbar" 
                    :height="310"
                    :inner-components="{upload:{maximageSize:3}}"
                    :locale="locale"
                    @input="inputEmitted">
                </sharp-markdown>
            </div>
        `;
        // mock range functions
        document.body.createTextRange = () => ({
            getBoundingClientRect: () => ({ }),
            getClientRects: () => ({ })
        });
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('can mount Markdown field', async () => {
        await createVm();

        expect(document.body.innerHTML).toMatchSnapshot();
    });

    it('can mount "localized" Markdown field', async () => {
        Localization.lang = jest.fn(() => 'LOCALIZED');
        await createVm();

        expect(document.body.innerHTML).toMatchSnapshot();
    });

    it('can mount "read only" Markdown field', async () => {
        await createVm({
            propsData: {
                readOnly: true
            }
        });

        expect(document.body.innerHTML).toMatchSnapshot();
    });

    it('update value on locale changed', async () => {
        let $markdown = await createVm({
            propsData: {
                locale: 'fr'
            },
            data: ()=>({
                value: { text:'Valeur 1' }
            })
        });

        let { $root:vm, simplemde } = $markdown;

        vm.value.text = 'Valeur 2';
        vm.locale = 'en';

        await Vue.nextTick();

        expect(simplemde.value()).toBe('Valeur 2');
    });

    it('expose appropriate props to simplemde', async () => {
        let $markdown = await createVm({
            propsData: {
                toolbar: [{ name:'my action' }]
            },
            data: ()=>({
                value: { text:'Valeur 1' }
            })
        });

        let { simplemde } = $markdown;
        let { textarea } = $markdown.$refs;

        expect(simplemde.options).toMatchObject({
            element: textarea,
            initialValue: 'Valeur 1',
            placeholder: 'Champ md',
            spellChecker: false,
            autoDownloadFontAwesome: false,
            toolbar: [{ name:'my action' }],
        });


    });

    it('bound toolbar buttons custom action properly', async () =>{
        let $markdown = await createVm({
            propsData: {
                toolbar: [{ name:'image'}]
            }
        });

        let { simplemde } = $markdown;
        $markdown.insertUploadImage = jest.fn();

        expect(simplemde.toolbar[0].action).toBeInstanceOf(Function);
        simplemde.toolbar[0].action();

        expect($markdown.insertUploadImage).toHaveBeenCalled();
    });

    it('set read only properly', async () => {
        let $markdown = await createVm();

        let { simplemde } = $markdown;
        let { codemirror } = simplemde;

        expect(codemirror.getOption('readOnly')).toBe(false);

        $markdown.setReadOnly();

        expect(codemirror.getOption('readOnly')).toBe(true);
    });

    it('add codemirror event listener properly', async () => {
        let $markdown = await createVm();

        let { simplemde: {codemirror}} = $markdown;

        let callback = jest.fn();
        codemirror.on = jest.fn();

        $markdown.codemirrorOn('event', callback);
        expect(codemirror.on).toHaveBeenCalledWith('event', callback);
        expect(callback).not.toHaveBeenCalled();

        $markdown.codemirrorOn('event', callback, true);
        expect(codemirror.on).toHaveBeenCalledTimes(2);
        expect(codemirror.on).toHaveBeenLastCalledWith('event', callback);
        expect(callback).toHaveBeenCalled();
    });

    it('emit input on text changed', async () => {
        let inputEmitted = jest.fn();
        let $markdown = await createVm({
            methods: {
                inputEmitted
            }
        });

        let { simplemde } = $markdown;

        simplemde.value('AAA');

        expect(inputEmitted).toHaveBeenLastCalledWith(expect.objectContaining({ text:'AAA' }));
    });


    describe('uploader insertion', () => {

        let mockCodemirror = codemirror => {
            //codemirror.getSelection = jest.fn(() => 'Image title');
            codemirror.markText = jest.fn(() => ({
                on: jest.fn(),
                clear: jest.fn(),
                lines: [{ on: jest.fn() }]
            }));
            codemirror.addLineClass = jest.fn();
        };

        let mockXHR = () => {
            XMLHttpRequest = jest.fn(() => ({
                send : jest.fn({

                })
            }));
        };

        it('insert image uploader and text properly', async () => {
            let $markdown = await createVm();

            let { simplemde } = $markdown;
            let { codemirror } = simplemde;

            mockCodemirror(codemirror);

            simplemde.value("Lorem Elsass ipsum");
            codemirror.setSelection({ line: 0, ch:5 }, { line: 0, ch:13 });

            $markdown.insertUploadImage({ isInsertion:true });

            expect(simplemde.value()).toBe('Lorem\n\n![]()\n\nipsum');
        });

        it('update image uploader and text properly', async () => {
            let $markdown = await createVm();

            let { simplemde } = $markdown;
            let { codemirror } = simplemde;

            mockCodemirror(codemirror);

            let $uploader = $markdown.insertUploadImage({ isInsertion:true });

            expect(simplemde.value()).toBe('\n![]()\n\n');

            $uploader.marker.find = jest.fn(() => ({ from:{ line: 1, ch: 0 }, to:{ line: 1, ch:5 }}) );
            $uploader.$emit('success', { name: 'cat.jpg' });

            expect(simplemde.value()).toBe('\n![](cat.jpg)\n\n');

            expect($markdown.value.files).toEqual([{
                [$markdown.idSymbol]: 0,
                name: 'cat.jpg'
            }]);
        });

        it('parse and insert image uploader and text properly', async () => {
            let $uploader = null;
            let $markdown = await createVm({
                data: ()=>({
                    value: {
                        text:'aaa\n![Cat](cat.jpg)\nbbb',
                        files:[{
                            name:'cat.jpg',
                            size: 123
                        }]
                    },
                }),
                components: {
                    'sharp-markdown': {
                        'extends': Markdown,
                        created() {
                            let insert = this.insertUploadImage;
                            this.insertUploadImage = jest.fn((...args)=>
                                $uploader = insert.apply(this, args)
                            );
                        }
                    }
                }
            });

            let { simplemde } = $markdown;
            let { codemirror } = simplemde;

            mockCodemirror(codemirror);

            codemirror.setSelection = jest.fn(codemirror.setSelection);

            $markdown.$tab.$emit('active');

            expect(simplemde.value()).toBe('aaa\n![Cat](cat.jpg)\nbbb');


            expect(codemirror.setSelection).toHaveBeenCalledTimes(1);
            expect(codemirror.setSelection).toHaveBeenCalledWith({ line:1, ch:0 }, { line:1, ch:15 });

            expect($markdown.insertUploadImage).toHaveBeenCalledTimes(1);
            expect($markdown.insertUploadImage).toHaveBeenCalledWith({ replaceBySelection:true, data:{ name:'cat.jpg', title:'Cat' } });

            expect($uploader.value).toMatchObject({
                name: 'cat.jpg',
                size: 123
            });
        });
    });
});

async function createVm(customOptions={}) {

    const vm = new Vue({
        el: '#app',
        mixins: [customOptions, MockInjections],

        props:['readOnly', 'toolbar', 'locale'],

        'extends': {
            data:() => ({
                value: {}
            }),
            methods: {
                inputEmitted: ()=>{}
            }
        }
    });

    await Vue.nextTick();

    return vm.$children[0];
}