(function(){
// Shared by the main UI and the generated classic script on the login page.
const NAME_LIMIT = 20;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
function nameLength(value) {
	const text = String(value).trim();
	const chars = segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
	return chars.reduce((sum, char) => sum + (/^[\x20-\x7e\uff61-\uff9f]$/.test(char) ? 1 : 2), 0);
}
function nameError(value) {
	return !String(value).trim() ? '名字不能为空' : nameLength(value) > NAME_LIMIT ? '姓名最多 20 个字符，中文及全角字符计 2 个' : '';
}

window.StarchainNamePolicy = { NAME_LIMIT, nameLength, nameError };
})();
