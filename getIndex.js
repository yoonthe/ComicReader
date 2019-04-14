const fs = require('fs').promises;
const Path = require('path');
const imgExts = require('./img.json');
const readline = require('readline');
const ejs = require('ejs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const getNumber = path => {
    const number = Number(/[0-9.]+/.exec(Path.basename(path)));
    return isNaN(number) ? Infinity : number;
}; 

const generateReader = async (path, answer, prev = '', next = '') => {
    const reads = await fs.readdir(path)
    const files = reads.sort((a, b) => getNumber(a) - getNumber(b));
    const home = Path.join(answer, 'index.html');
    const imgs = [];
    let menus = [];
    for (let i = 0; i < files.length; i ++ ) {
        const file = files[i];
        const prevFilePath = files[i - 1] ? Path.join(path, files[i - 1]) : '';
        const nextFilePath = files[i + 1] ? Path.join(path, files[i + 1]) : '';
        const filePath = Path.join(path, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            const children = await generateReader(filePath, answer, prevFilePath, nextFilePath);
            if (Array.isArray(children) && Array.isArray(children[0].children)) {
                menus = menus.concat(children.map(c => Object.assign(c, {
                    name: `${file}/${c.name}`,
                })));
            } else {
                menus.push({
                    name: file,
                    children,
                });
            }
        } else {
            const ext = Path.extname(filePath);
            if (imgExts.includes(ext)) {
                imgs.push(filePath);
            }
        }
    }
    if (imgs.length > 0) {
        const dirname = Path.relative(answer, path)
            .replace(/^(\\|\/)/, '')
            .replace(/\\/g, '/');
        const data = await ejs.renderFile('template.ejs',
            {
                imgs: imgs.sort((a,b) => getNumber(a) - getNumber(b)),
                dirname,
                home,
                prev: prev && `${prev}/index.html`,
                next: next && `${next}/index.html`,
            });
        const index = Path.join(path, 'index.html');
        await fs.writeFile(index, data, 'utf8');
        return index;
    }
    return menus;
}


const answerHandler = answer => {
    const index = Path.join(answer, 'index.html');
    fs.access(answer)
        .then(() => generateReader(answer, answer))
        .then(menus => ejs.renderFile('menu.ejs', { menus, dirname: Path.basename(answer) }))
        .then(data => fs.writeFile(index, data, 'utf8'))
        .then(() => {
            console.log('生成完成！请在浏览器内访问:', index);
            rl.close();
        }).catch(
            (err) => {
                console.error(err);
                rl.question('输入错误，请重新输入：', answerHandler);
            }
        )
};

rl.question('请输入漫画文件夹路径:', answerHandler);
