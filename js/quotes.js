"use strict";
// Kho câu tâm trạng viết sẵn (dùng khi chưa có khoá AI hoặc mất mạng). tag: mua | dem | den | chung
window.QUOTES = [
  { tag: "mua", text: "Giống như khi trời đổ mưa bất chợt, có những nỗi buồn cũng đến mà mình chẳng kịp chuẩn bị gì cả.", caption: "Có những nỗi buồn đến bất chợt như mưa" },
  { tag: "mua", text: "Mưa thì rồi cũng sẽ tạnh.\n\nChỉ là có những ngày, mình mong nó rơi lâu thêm một chút, để chẳng ai nhận ra mình đang khóc.", caption: "Mong mưa rơi lâu thêm một chút" },
  { tag: "mua", text: "Có những cơn mưa không làm ướt áo, nhưng lại làm lòng mình nặng trĩu cả một buổi chiều.", caption: "Cơn mưa làm lòng mình nặng trĩu" },
  { tag: "mua", text: "Ngồi nghe mưa rơi mới thấy, hoá ra mình đã giữ trong lòng nhiều chuyện đến vậy.", caption: "Nghe mưa rơi mới thấy" },
  { tag: "mua", text: "Trời mưa, đường vắng, mình cũng chẳng biết nên về đâu cho lòng nhẹ đi một chút.", caption: "Không biết nên về đâu" },
  { tag: "mua", text: "Người ta sợ mưa vì sợ ướt.\nCòn mình thích mưa, vì những lúc đó buồn một chút cũng chẳng ai để ý.", caption: "Thích mưa vì buồn chẳng ai để ý" },
  { tag: "mua", text: "Có những ngày mưa, mình chỉ muốn được ai đó hỏi một câu: \"Hôm nay cậu có ổn không?\"", caption: "Hôm nay cậu có ổn không?" },
  { tag: "mua", text: "Mưa rơi trên phố, rơi cả vào những điều mình chưa từng nói ra.", caption: "Những điều chưa từng nói ra" },
  { tag: "dem", text: "Có những chuyện tưởng đã quên, nhưng chỉ cần một khoảnh khắc yên tĩnh là lại ùa về. Muốn tâm sự với ai đó, nhưng rồi lại sợ chẳng ai hiểu, thế là lại chọn im lặng...", caption: "Lại chọn im lặng" },
  { tag: "dem", text: "Ban ngày cười nói bình thường, đến đêm mới dám thật lòng với chính mình.", caption: "Đêm mới dám thật lòng" },
  { tag: "dem", text: "Đêm nay lại là một đêm mình nghĩ quá nhiều, về những chuyện chẳng thể thay đổi được nữa.", caption: "Lại một đêm nghĩ quá nhiều" },
  { tag: "dem", text: "Có những lúc mệt đến mức chẳng muốn giải thích gì nữa, chỉ muốn ngồi yên một mình thật lâu.", caption: "Chỉ muốn ngồi yên một mình" },
  { tag: "dem", text: "Thành phố về đêm đẹp thật, chỉ tiếc là người mình muốn kể cho nghe thì không còn ở đây nữa.", caption: "Người mình muốn kể không còn ở đây" },
  { tag: "dem", text: "Đi qua bao nhiêu con đường, cuối cùng vẫn là mình tự ôm lấy mình mà về.", caption: "Tự ôm lấy mình mà về" },
  { tag: "dem", text: "Càng lớn càng hiểu, có những nỗi buồn chỉ có thể kể cho màn đêm nghe.", caption: "Kể cho màn đêm nghe" },
  { tag: "dem", text: "Mình không sợ cô đơn.\nMình chỉ sợ cái cảm giác có người bên cạnh mà vẫn thấy một mình.", caption: "Có người bên cạnh mà vẫn một mình" },
  { tag: "den", text: "Ánh đèn đường vẫn sáng như mọi đêm, chỉ có lòng mình là tối đi một chút.", caption: "Lòng mình tối đi một chút" },
  { tag: "den", text: "Đứng dưới ánh đèn đường mới nhận ra, mình đã một mình lâu đến vậy rồi.", caption: "Một mình lâu đến vậy rồi" },
  { tag: "den", text: "Mỗi ô cửa sáng đèn là một câu chuyện. Còn câu chuyện của mình, chắc chẳng ai muốn nghe.", caption: "Câu chuyện chẳng ai muốn nghe" },
  { tag: "den", text: "Có những con đường quen, đi mãi rồi cũng thấy lạ, vì người đi cùng đã không còn.", caption: "Con đường quen bỗng thấy lạ" },
  { tag: "chung", text: "Đôi lúc mình cảm thấy sau này bản thân nên ở một mình, vì sợ rằng những suy nghĩ tiêu cực và tính cách của mình sẽ làm phiền đến người khác.", caption: "Sợ làm phiền đến người khác" },
  { tag: "chung", text: "Đôi khi cảm thấy buồn nhưng chẳng dám chia sẻ, chỉ vì sợ rằng trong mắt người khác, đó chỉ là chuyện nhỏ, chẳng đáng để bận tâm.", caption: "Buồn nhưng chẳng dám chia sẻ" },
  { tag: "chung", text: "Cảm giác thật tệ khi khóc trước mặt nhiều người.\n\nCàng tệ hơn khi họ không quan tâm đến. Nhưng khi họ dỗ mình thì lại càng khóc nhiều hơn.", caption: "Tệ thật khi mà khóc ở trường" },
  { tag: "chung", text: "Phải trong hoàn cảnh đó mới hiểu được nó như nào. Người ngoài nhìn vào, sao mà hiểu hết được.", caption: "Phải trong hoàn cảnh đó mới hiểu" },
  { tag: "chung", text: "Có phải bạn cũng đã từng cố tỏ ra ổn, chỉ để không ai phải lo lắng cho mình?", caption: "Có phải bạn cũng đã từng" },
  { tag: "chung", text: "Không phải mình không buồn, chỉ là mình đã quen với việc tự mình vượt qua.", caption: "Quen với việc tự mình vượt qua" },
  { tag: "chung", text: "Có những người mình không thể giữ, chỉ có thể lặng lẽ nhìn họ rời đi.", caption: "Lặng lẽ nhìn họ rời đi" },
  { tag: "chung", text: "Mình đã từng nghĩ, chỉ cần cố gắng là sẽ được thương. Hoá ra không phải vậy.", caption: "Cố gắng chưa chắc được thương" },
  { tag: "chung", text: "Lớn rồi, buồn cũng phải chọn lúc. Khóc cũng phải chọn chỗ.", caption: "Lớn rồi buồn cũng phải chọn lúc" },
  { tag: "chung", text: "Có những câu \"không sao đâu\" nói ra nhẹ tênh, nhưng là cả một bầu trời mệt mỏi phía sau.", caption: "Không sao đâu" },
  { tag: "chung", text: "Chỉ khoảnh khắc đó thôi, mình đã biết có những thứ sẽ không bao giờ quay lại như trước.", caption: "Chỉ khoảnh khắc đó" },
  { tag: "chung", text: "Mình không giận đâu, mình chỉ đang học cách không còn mong đợi nữa.", caption: "Học cách không còn mong đợi" },
  { tag: "chung", text: "Có những mối quan hệ không kết thúc bằng một cuộc cãi vã, mà bằng những lần im lặng kéo dài.", caption: "Kết thúc bằng im lặng" },
  { tag: "chung", text: "Người ta hay hỏi sao dạo này ít nói. Thật ra là vì nói ra cũng chẳng ai hiểu.", caption: "Sao dạo này ít nói" },
  { tag: "chung", text: "Nhiều khi chỉ cần một cái ôm thôi, mà sao khó tìm đến vậy.", caption: "Chỉ cần một cái ôm" },
  { tag: "chung", text: "Mình vẫn ổn, chỉ là đôi khi thấy mệt vì phải tỏ ra ổn.", caption: "Mệt vì phải tỏ ra ổn" },
  { tag: "chung", text: "Có những vết thương không ai thấy, nên cũng chẳng ai hỏi mình có đau không.", caption: "Vết thương không ai thấy" },
  { tag: "chung", text: "Thứ làm mình buồn nhất không phải là bị bỏ lại, mà là đã từng tin rằng sẽ không bị bỏ lại.", caption: "Đã từng tin sẽ không bị bỏ lại" },
  { tag: "chung", text: "Đến một lúc nào đó, mình sẽ thôi chờ một tin nhắn không bao giờ đến.", caption: "Thôi chờ một tin nhắn" },
  { tag: "chung", text: "Hy vọng sau tất cả, mình vẫn giữ được sự dịu dàng với chính bản thân mình.", caption: "Dịu dàng với chính mình" },
];
QUOTES.pick = function (n = 5, tags = [], exclude = []) {
  const ex = new Set(exclude.map(s => s.trim()));
  let pool = QUOTES.filter(q => !ex.has(q.text) && (!tags.length || tags.includes(q.tag) || q.tag === "chung"));
  pool = pool.sort(() => Math.random() - 0.5);
  const pref = pool.filter(q => tags.includes(q.tag)), rest = pool.filter(q => !tags.includes(q.tag));
  return [...pref.slice(0, Math.ceil(n / 2)), ...rest].slice(0, n);
};
