#!/usr/bin/env bash
# 把 dist/ 发布到自己的服务器（rsync 走 ssh，服务器上放静态文件就行）。
#
#   node scripts/build.mjs --sync   # 先把书稿更新到最新，再构建
#   scripts/deploy.sh               # 再上传，并从公网核对
#
# 服务器信息放在项目根目录的 .deploy.env 里，这个文件不进仓库，照 .deploy.env.example 写一份。
# nginx 配置只需要配一次，例子见 scripts/nginx-example.conf；以后更新只传文件。
# 每次上传前，服务器上的上一版会先存到同一层的隐藏目录（比如 /var/www/.live-prev），出问题可以换回去。
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .deploy.env ] && . ./.deploy.env
HOST="${DEPLOY_HOST:?没设置 DEPLOY_HOST，照 .deploy.env.example 写一份 .deploy.env}"
DEST="${DEPLOY_PATH:?没设置 DEPLOY_PATH}"
DEST="${DEST%/}"
[[ "$DEST" == /* ]] && [ "$DEST" != "/" ] || { echo "DEPLOY_PATH 必须是非根目录的绝对路径" >&2; exit 1; }
URL="${DEPLOY_URL:?没设置 DEPLOY_URL}"
URL="${URL%/}/"
PREV="$(dirname "$DEST")/.$(basename "$DEST")-prev"
printf -v DEST_Q '%q' "$DEST"
printf -v PREV_Q '%q' "$PREV"
SSH="ssh ${SSH_OPTS:-}"

[ -f dist/index.html ] && [ -f dist/sw.js ] || { echo "dist/ 不完整，先跑 node scripts/build.mjs" >&2; exit 1; }
VERSION=$(sed -n "s/^const VERSION = '\(.*\)';\$/\1/p" dist/sw.js)
[ -n "$VERSION" ] || { echo "没从 dist/sw.js 读到版本号" >&2; exit 1; }
echo "发布 $VERSION → $HOST:$DEST"

# 留一份上一版；目录第一次用时建好，归登录用户，nginx 只读
$SSH "$HOST" "set -e
  if [ -f $DEST_Q/index.html ]; then sudo rm -rf $PREV_Q; sudo cp -a $DEST_Q $PREV_Q; fi
  sudo install -d -o \$(id -un) -g \$(id -gn) -m 755 $DEST_Q"

# --delay-updates：全部传完再一起换上，免得有人正好打开时拿到新旧混杂的文件
rsync -rlptz --delete --delay-updates --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r -e "$SSH" dist/ "$HOST:$DEST/"

# 从公网核对：首页和离线缓存脚本都已经是这个版本，关键文件都打得开
# 样式和脚本已经写在首页里了，看首页里记的版本号。
# 先整个下完再查：grep -q 一找到就退出，会把还在下载的 curl 掐断，在 pipefail 下被误判成失败
PAGE=$(curl -fsS "$URL") || { echo "首页打不开" >&2; exit 1; }
grep -qF "name=\"ssd-version\" content=\"$VERSION\"" <<<"$PAGE" || { echo "首页还不是新版本" >&2; exit 1; }
SWJS=$(curl -fsS "${URL}sw.js") || { echo "sw.js 打不开" >&2; exit 1; }
grep -qF "$VERSION" <<<"$SWJS" || { echo "sw.js 还不是新版本" >&2; exit 1; }
for f in manifest.json data/meta.json data/index.json data/updates.json data/ch/01.json icons/icon-192.png; do
  curl -fsS -o /dev/null "$URL$f" || { echo "打不开 $URL$f" >&2; exit 1; }
done
echo "已上线：$URL（$VERSION）"
